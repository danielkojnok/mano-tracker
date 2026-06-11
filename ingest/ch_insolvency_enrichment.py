"""
ingest/ch_insolvency_enrichment.py
One-off backfill: enrich every company in insolvencies_record_level
(month_registered >= 2024-06) with Companies House profile + insolvency data.

Per company (2 API calls):
  /company/{n}            → date_of_creation, company_type
  /company/{n}/insolvency → practitioners[0]: name, appointed_on, address

Two-phase architecture (same pattern as gazette_backfill.py):
  Phase 1 (this script): backfill → data/ch_insolvency_enrichment.csv
  committed to git as a seed; tracker.db is NOT in git, CI loads the CSV.

Chunked for parallel matrix jobs (one API key per chunk):
  --chunk-index N --chunk-total M  → processes the N-th of M slices,
  writing data/ch_enrich_chunk_N.csv. With --chunk-total 1 the script
  writes directly to the final CSV. When all chunk files exist and are
  non-empty, merge_chunks() combines them into the final CSV and upserts
  into the DB. --merge-only performs just that step (no API calls).
  --limit K caps the number of companies (testing).
  --api-key KEY overrides the COMPANIES_HOUSE_API_KEY env var.

Rate limiting: 0.4s sleep between calls (~5.1h per chunk of ~23k firms,
fits the GitHub Actions 6h job limit). Respects X-Ratelimit-Remain /
X-Ratelimit-Reset headers; on HTTP 429 backs off 10s/30s/60s (max 3 retries).
Resumable: skips company_numbers already present in the chunk CSV.
"""

import argparse
import os
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "tracker.db"
FINAL_CSV = ROOT / "data" / "ch_insolvency_enrichment.csv"

load_dotenv(ROOT / ".env")

BASE_URL = "https://api.company-information.service.gov.uk"
SINCE_MONTH = "2024-06"
SLEEP_BETWEEN = 0.4      # seconds after each API call
RATELIMIT_FLOOR = 10     # wait for reset when X-Ratelimit-Remain drops below this
BACKOFF_429 = [10, 30, 60]
CHECKPOINT_EVERY = 500   # companies between CSV checkpoints
LOG_EVERY = 1000

CSV_COLUMNS = ["company_number", "date_of_creation", "company_type",
               "ip_name", "ip_address_line", "ip_locality", "ip_postal_code",
               "ip_appointed_on", "enriched_at"]


def chunk_csv(index: int, total: int) -> Path:
    if total == 1:
        return FINAL_CSV
    return ROOT / "data" / f"ch_enrich_chunk_{index}.csv"


def get_api_key(override: str | None = None) -> str:
    key = (override or os.getenv("COMPANIES_HOUSE_API_KEY", "")).strip()
    if not key:
        raise RuntimeError("COMPANIES_HOUSE_API_KEY not set. Add it to .env, environment, or pass --api-key.")
    return key


def ensure_table(conn: sqlite3.Connection) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ch_insolvency_enrichment (
            company_number   TEXT PRIMARY KEY,
            date_of_creation TEXT,
            company_type     TEXT,
            ip_name          TEXT,
            ip_address_line  TEXT,
            ip_locality      TEXT,
            ip_postal_code   TEXT,
            ip_appointed_on  TEXT,
            enriched_at      TEXT
        )
    """)
    # idempotent column additions for DBs created by earlier versions
    cols = {r[1] for r in conn.execute("PRAGMA table_info(ch_insolvency_enrichment)").fetchall()}
    for col in ("ip_address_line", "ip_locality", "ip_postal_code"):
        if col not in cols:
            conn.execute(f"ALTER TABLE ch_insolvency_enrichment ADD COLUMN {col} TEXT")
    conn.commit()


def get_target_companies(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute("""
        SELECT DISTINCT company_number
        FROM insolvencies_record_level
        WHERE month_registered >= ?
          AND company_number IS NOT NULL
          AND company_number != ''
        ORDER BY company_number
    """, (SINCE_MONTH,)).fetchall()
    return [str(r[0]).strip() for r in rows]


def _respect_ratelimit(resp: requests.Response) -> None:
    """If X-Ratelimit-Remain is low, sleep until X-Ratelimit-Reset."""
    try:
        remain = int(resp.headers.get("X-Ratelimit-Remain", ""))
    except ValueError:
        return
    if remain >= RATELIMIT_FLOOR:
        return
    try:
        reset_ts = int(resp.headers.get("X-Ratelimit-Reset", ""))
        wait = max(0, reset_ts - time.time()) + 1
    except ValueError:
        wait = 60
    print(f"  [ch_enrich] ratelimit remain={remain} — waiting {wait:.0f}s until reset")
    time.sleep(wait)


def _get(url: str, api_key: str) -> tuple[int, dict | None]:
    """GET with 429 backoff (10/30/60s, max 3 retries). Returns (status, json-or-None)."""
    for attempt, delay in enumerate([0] + BACKOFF_429):
        if delay:
            print(f"  [ch_enrich] 429 — backoff {delay}s (retry {attempt}/{len(BACKOFF_429)})")
            time.sleep(delay)
        try:
            resp = requests.get(url, auth=(api_key, ""), timeout=15)
        except requests.RequestException as exc:
            print(f"  [ch_enrich] request error: {exc} — treating as miss")
            return 0, None
        if resp.status_code == 429:
            continue
        _respect_ratelimit(resp)
        if resp.status_code == 200:
            try:
                return 200, resp.json()
            except ValueError:
                return 200, None
        return resp.status_code, None
    return 429, None


def _first_practitioner(insolvency: dict | None) -> dict | None:
    """
    Extract first practitioner across all cases. The CH API sometimes
    returns `practitioners` as an Object instead of an Array — handle both.
    """
    if not insolvency:
        return None
    for case in insolvency.get("cases") or []:
        pracs = case.get("practitioners")
        if isinstance(pracs, dict):
            pracs = [pracs]
        if isinstance(pracs, list) and pracs:
            first = pracs[0]
            if isinstance(first, dict):
                return first
    return None


def _practitioner_address(prac: dict | None) -> dict:
    """practitioners[0].address can be Object or Array (CH API quirk) — handle both."""
    addr = (prac or {}).get("address")
    if isinstance(addr, list):
        addr = addr[0] if addr and isinstance(addr[0], dict) else None
    return addr if isinstance(addr, dict) else {}


def enrich_company(number: str, api_key: str) -> dict:
    padded = number.zfill(8)
    _, profile = _get(f"{BASE_URL}/company/{padded}", api_key)
    time.sleep(SLEEP_BETWEEN)
    _, insolvency = _get(f"{BASE_URL}/company/{padded}/insolvency", api_key)
    time.sleep(SLEEP_BETWEEN)

    prac = _first_practitioner(insolvency)
    addr = _practitioner_address(prac)
    return {
        "company_number":   padded,
        "date_of_creation": (profile or {}).get("date_of_creation"),
        "company_type":     (profile or {}).get("type"),
        "ip_name":          (prac or {}).get("name"),
        "ip_address_line":  addr.get("address_line_1"),
        "ip_locality":      addr.get("locality"),
        "ip_postal_code":   addr.get("postal_code"),
        "ip_appointed_on":  (prac or {}).get("appointed_on"),
        "enriched_at":      datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


def load_existing(path: Path) -> pd.DataFrame:
    if path.exists():
        df = pd.read_csv(path, dtype=str)
        for col in CSV_COLUMNS:
            if col not in df.columns:
                df[col] = None
        return df[CSV_COLUMNS]
    return pd.DataFrame(columns=CSV_COLUMNS)


def save_csv(rows: list[dict], path: Path) -> pd.DataFrame:
    df = pd.DataFrame(rows, columns=CSV_COLUMNS)
    df = df.drop_duplicates(subset="company_number", keep="last")
    df = df.sort_values("company_number")
    df.to_csv(path, index=False)
    return df


def upsert_to_db(df: pd.DataFrame, db_path: Path = DB_PATH) -> int:
    conn = sqlite3.connect(db_path)
    ensure_table(conn)
    n = 0
    for _, row in df.iterrows():
        conn.execute(f"""
            INSERT OR REPLACE INTO ch_insolvency_enrichment
              ({", ".join(CSV_COLUMNS)})
            VALUES ({", ".join("?" * len(CSV_COLUMNS))})
        """, tuple(row.get(c) if pd.notna(row.get(c)) else None for c in CSV_COLUMNS))
        n += 1
    conn.commit()
    conn.close()
    return n


def merge_chunks(chunk_total: int | None = None) -> pd.DataFrame | None:
    """
    Merge chunk CSVs into the final seed CSV and upsert into the DB.
    With chunk_total=None, discovers data/ch_enrich_chunk_*.csv by glob
    (used by --merge-only in the CI merge job).
    """
    if chunk_total is None:
        paths = sorted((ROOT / "data").glob("ch_enrich_chunk_*.csv"))
    else:
        paths = [chunk_csv(i, chunk_total) for i in range(chunk_total)]
    if not paths:
        print("[ch_enrich] merge skipped — no chunk files found")
        return None
    missing = [p.name for p in paths if not p.exists() or p.stat().st_size == 0]
    if missing:
        print(f"[ch_enrich] merge skipped — missing/empty chunk files: {missing}")
        return None
    df = pd.concat([load_existing(p) for p in paths], ignore_index=True)
    df = df.drop_duplicates(subset="company_number", keep="last").sort_values("company_number")
    df.to_csv(FINAL_CSV, index=False)
    upsert_to_db(df)
    print(f"[ch_enrich] Merged {len(paths)} chunks → {len(df):,} total rows "
          f"({FINAL_CSV.name} + DB)")
    return df


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--chunk-index", type=int, default=0)
    ap.add_argument("--chunk-total", type=int, default=1)
    ap.add_argument("--limit", type=int, default=None,
                    help="cap number of companies in this chunk (testing)")
    ap.add_argument("--api-key", default=None,
                    help="override COMPANIES_HOUSE_API_KEY env var")
    ap.add_argument("--merge-only", action="store_true",
                    help="merge existing chunk CSVs into the final CSV + DB, no API calls")
    args = ap.parse_args()

    if args.merge_only:
        merge_chunks(None)
        return

    api_key = get_api_key(args.api_key)
    conn = sqlite3.connect(DB_PATH)
    targets = get_target_companies(conn)
    conn.close()

    # Interleaved slicing: company i goes to chunk i % chunk_total.
    chunk = [n for i, n in enumerate(targets) if i % args.chunk_total == args.chunk_index]
    if args.limit:
        chunk = chunk[:args.limit]

    out_path = chunk_csv(args.chunk_index, args.chunk_total)
    existing = load_existing(out_path)
    done = set(existing["company_number"].astype(str).str.zfill(8))
    pending = [n for n in chunk if n.zfill(8) not in done]

    print(f"[ch_enrich] {len(targets):,} target companies total | "
          f"chunk {args.chunk_index}/{args.chunk_total}: {len(chunk):,} | "
          f"already done: {len(done):,} | pending: {len(pending):,}")

    rows = existing.to_dict("records")
    start = time.time()
    for i, number in enumerate(pending, 1):
        rows.append(enrich_company(number, api_key))

        if i % CHECKPOINT_EVERY == 0:
            save_csv(rows, out_path)
        if i % LOG_EVERY == 0 or i == len(pending):
            rate = i / (time.time() - start)
            eta_h = (len(pending) - i) / rate / 3600 if rate else 0
            print(f"[ch_enrich] {i}/{len(pending)} | ETA: ~{eta_h:.1f}h")

    df = save_csv(rows, out_path)
    print(f"\n[ch_enrich] ── Chunk {args.chunk_index} summary ──")
    print(f"  Rows in chunk CSV : {len(df):,}")
    print(f"  date_of_creation  : {df['date_of_creation'].notna().sum():,} filled")
    print(f"  ip_name           : {df['ip_name'].notna().sum():,} filled")
    print(f"  ip_postal_code    : {df['ip_postal_code'].notna().sum():,} filled")
    print(f"  Output            : {out_path}")

    # Auto-merge when every chunk file exists and is non-empty.
    merge_chunks(args.chunk_total)


if __name__ == "__main__":
    main()
