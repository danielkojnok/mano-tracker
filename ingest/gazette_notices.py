"""
ingest/gazette_notices.py
Polls The Gazette Atom feed for insolvency notices and loads into SQLite.

Notice types:
  2443 = liquidator_appointment   (confirms CVL/compulsory has started)
  2450 = winding_up_petition      (earliest possible insolvency signal)

Seed CSV:
  data/gazette_backfill.csv is committed to git and loaded first on every
  run so CI rebuilds the full history without re-hitting the Gazette API.
"""

import sqlite3
from pathlib import Path

import feedparser
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "tracker.db"
SEED_CSV = ROOT / "data" / "gazette_backfill.csv"

FEED_URL = (
    "https://www.thegazette.co.uk/all-notices/notice/data.feed"
    "?categorycode=13&noticetypes=2443,2450&results-page-size=200"
)
HEADERS = {"User-Agent": "mano-tracker/0.5"}

NOTICE_LABELS = {
    "2443": "liquidator_appointment",
    "2450": "winding_up_petition",
}


def _ensure_schema(conn: sqlite3.Connection) -> None:
    """Create table and add any missing columns (idempotent)."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS gazette_notices (
            notice_id         TEXT PRIMARY KEY,
            date              TEXT,
            notice_type       TEXT,
            notice_type_label TEXT,
            company_name      TEXT,
            company_number    TEXT
        )
    """)
    cols = {r[1] for r in conn.execute("PRAGMA table_info(gazette_notices)").fetchall()}
    if "notice_type_label" not in cols:
        conn.execute("ALTER TABLE gazette_notices ADD COLUMN notice_type_label TEXT")
    if "edition" not in cols:
        conn.execute("ALTER TABLE gazette_notices ADD COLUMN edition TEXT")


def load_seed_csv(db_path: Path = DB_PATH) -> int:
    """
    Load data/gazette_backfill.csv (committed to git) into gazette_notices.
    Called first on every run so CI has full history without hitting the API.
    Idempotent — INSERT OR IGNORE skips already-present notice_ids.
    """
    if not SEED_CSV.exists():
        print("[gazette] No seed CSV found — skipping.")
        return 0
    df = pd.read_csv(SEED_CSV, dtype=str)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    _ensure_schema(conn)
    inserted = 0
    for _, row in df.iterrows():
        notice_code = str(row.get("notice_type", "")).strip()
        cur = conn.execute("""
            INSERT OR IGNORE INTO gazette_notices
              (notice_id, date, notice_type, notice_type_label, company_name, company_number, edition)
            VALUES (?,?,?,?,?,?,?)
        """, (
            row.get("notice_id"),
            row.get("published_date"),
            notice_code,
            NOTICE_LABELS.get(notice_code, "unknown"),
            row.get("company_name"),
            row.get("company_number") if pd.notna(row.get("company_number")) else None,
            row.get("edition") if pd.notna(row.get("edition")) else None,
        ))
        inserted += cur.rowcount
    conn.commit()
    conn.close()
    print(f"[gazette] Loaded {inserted:,} new rows from seed CSV ({len(df):,} total in CSV)")
    return inserted


def fetch_feed() -> list[dict]:
    feed = feedparser.parse(FEED_URL, request_headers=HEADERS)
    status = getattr(feed, "status", None)
    if status and status >= 400:
        raise RuntimeError(f"Gazette feed returned HTTP {status}")
    entries = []
    for e in feed.entries:
        notice_code = str(e.get("f_notice-code", "")).strip()
        entries.append({
            "notice_id":          e.get("id", "").strip(),
            "date":               e.get("published", "")[:10],
            "notice_type":        notice_code,
            "notice_type_label":  NOTICE_LABELS.get(notice_code, "unknown"),
            "company_name":       e.get("title", "").strip(),
            "company_number":     str(e.get("f_name", "")).strip() or None,
        })
    return entries


def load_to_db(entries: list[dict], db_path: Path) -> int:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    _ensure_schema(conn)
    inserted = 0
    for e in entries:
        cur = conn.execute("""
            INSERT OR IGNORE INTO gazette_notices
              (notice_id, date, notice_type, notice_type_label, company_name, company_number)
            VALUES (?,?,?,?,?,?)
        """, (
            e["notice_id"], e["date"], e["notice_type"],
            e["notice_type_label"], e["company_name"], e["company_number"],
        ))
        inserted += cur.rowcount
    conn.commit()
    conn.close()
    return inserted


def print_summary(entries: list[dict], inserted: int) -> None:
    dates = [e["date"] for e in entries if e["date"]]
    petitions    = sum(1 for e in entries if e["notice_type"] == "2450")
    appointments = sum(1 for e in entries if e["notice_type"] == "2443")
    print(f"\n[gazette] ── Summary ──")
    print(f"  Entries fetched         : {len(entries)}")
    print(f"  New rows inserted       : {inserted}")
    print(f"  Winding-up petitions    : {petitions}")
    print(f"  Liquidator appointments : {appointments}")
    print(f"  Date range              : {min(dates) if dates else 'N/A'} → {max(dates) if dates else 'N/A'}")


def run() -> list[dict]:
    load_seed_csv(DB_PATH)
    print("[gazette] Fetching Gazette feed…")
    entries  = fetch_feed()
    inserted = load_to_db(entries, DB_PATH)
    print_summary(entries, inserted)
    return entries


if __name__ == "__main__":
    run()
