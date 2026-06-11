"""
ingest/record_level.py
Downloads the Insolvency Service record-level CSV (England, Wales & Scotland)
and loads it into SQLite table: insolvencies_record_level.

Actual CSV columns (March 2026 release):
  company_number, company_name, register_location, case_type,
  month_registered, sic07_1_digit … sic07_5_digit, is_bulk
"""

import io
import re
import sqlite3
import zipfile
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parent.parent
DB_PATH    = ROOT / "data" / "tracker.db"
CACHE_PATH = ROOT / "data" / "record_level_cache.zip"

RELEASE_PAGE = "https://www.gov.uk/government/statistics/company-insolvencies-march-2026"

SIC2_LABELS = {
    "56": "Food & beverage services",
    "82": "Office admin & business support",
    "41": "Construction of buildings",
    "47": "Retail trade",
    "43": "Specialised construction",
    "46": "Wholesale trade",
    "45": "Motor vehicle trade",
    "68": "Real estate",
    "49": "Land transport",
    "70": "Head offices / management consultancy",
}


def find_record_level_url() -> str:
    resp = requests.get(RELEASE_PAGE, timeout=15)
    resp.raise_for_status()
    urls = re.findall(
        r"(https://assets\.publishing\.service\.gov\.uk[^\"']+[Rr]ecord[^\"']+\.(?:csv|zip))",
        resp.text,
    )
    if urls:
        print(f"[record_level] Found: {urls[0]}")
        return urls[0]
    raise RuntimeError("Could not find record-level file on release page")


def download_and_parse(url: str) -> pd.DataFrame:
    if CACHE_PATH.exists():
        print(f"[record_level] Using cached file: {CACHE_PATH}")
        raw = CACHE_PATH.read_bytes()
    else:
        print("[record_level] Downloading…")
        resp = requests.get(url, timeout=120)
        resp.raise_for_status()
        raw = resp.content
        CACHE_PATH.write_bytes(raw)

    if url.endswith(".zip"):
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            csv_names = [n for n in z.namelist()
                         if n.endswith(".csv") and "etadata" not in n]
            with z.open(csv_names[0]) as f:
                df = pd.read_csv(f, low_memory=False, encoding="latin-1")
    else:
        df = pd.read_csv(io.StringIO(raw.decode("latin-1")), low_memory=False)

    df.columns = [c.strip().lower() for c in df.columns]

    # Rename sic columns to shorter names
    renames = {
        "sic07_1_digit": "sic_1digit",
        "sic07_2_digit": "sic_2digit",
        "sic07_3_digit": "sic_3digit",
        "sic07_4_digit": "sic_4digit",
        "sic07_5_digit": "sic_5digit",
    }
    df = df.rename(columns={k: v for k, v in renames.items() if k in df.columns})

    # Computed helper columns
    ct = df["case_type"].str.strip() if "case_type" in df.columns else pd.Series("", index=df.index)
    df["is_cvl"]            = (ct == "Creditors Voluntary Liquidation").astype(int)
    df["is_compulsory"]     = (ct == "Compulsory Liquidation").astype(int)
    df["is_administration"] = ct.str.contains("Administration", case=False, na=False).astype(int)

    return df


def load_to_db(df: pd.DataFrame, db_path: Path) -> int:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)

    conn.execute("DROP TABLE IF EXISTS insolvencies_record_level")
    conn.execute("""
        CREATE TABLE insolvencies_record_level (
            company_number    TEXT,
            company_name      TEXT,
            register_location TEXT,
            case_type         TEXT,
            month_registered  TEXT,
            sic_1digit        TEXT,
            sic_2digit        TEXT,
            sic_3digit        TEXT,
            sic_4digit        TEXT,
            sic_5digit        TEXT,
            is_bulk           TEXT,
            is_cvl            INTEGER DEFAULT 0,
            is_compulsory     INTEGER DEFAULT 0,
            is_administration INTEGER DEFAULT 0,
            PRIMARY KEY (company_number, case_type, month_registered)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_rl_month ON insolvencies_record_level(month_registered)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_rl_type  ON insolvencies_record_level(case_type)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_rl_sic2  ON insolvencies_record_level(sic_2digit)")

    def _s(v):
        return None if pd.isna(v) else str(v)

    def _i(v):
        try:
            return int(v)
        except Exception:
            return 0

    rows_inserted = 0
    for _, row in df.iterrows():
        cur = conn.execute("""
            INSERT OR IGNORE INTO insolvencies_record_level
              (company_number, company_name, register_location, case_type,
               month_registered, sic_1digit, sic_2digit, sic_3digit, sic_4digit,
               sic_5digit, is_bulk, is_cvl, is_compulsory, is_administration)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            _s(row.get("company_number")),
            _s(row.get("company_name")),
            _s(row.get("register_location")),
            _s(row.get("case_type")),
            _s(row.get("month_registered")),
            _s(row.get("sic_1digit")),
            _s(row.get("sic_2digit")),
            _s(row.get("sic_3digit")),
            _s(row.get("sic_4digit")),
            _s(row.get("sic_5digit")),
            _s(row.get("is_bulk")),
            _i(row.get("is_cvl", 0)),
            _i(row.get("is_compulsory", 0)),
            _i(row.get("is_administration", 0)),
        ))
        rows_inserted += cur.rowcount

    conn.commit()
    conn.close()
    return rows_inserted


def print_summary(db_path: Path) -> None:
    conn = sqlite3.connect(db_path)

    total = conn.execute(
        "SELECT COUNT(*) FROM insolvencies_record_level"
    ).fetchone()[0]

    date_range = conn.execute(
        "SELECT MIN(month_registered), MAX(month_registered) FROM insolvencies_record_level"
    ).fetchone()

    top_sic = conn.execute("""
        SELECT sic_2digit, COUNT(*) n
        FROM insolvencies_record_level
        WHERE sic_2digit IS NOT NULL
        GROUP BY sic_2digit ORDER BY n DESC LIMIT 5
    """).fetchall()

    bucket = conn.execute("""
        SELECT
            SUM(is_cvl)            AS cvl,
            SUM(is_compulsory)     AS compulsory,
            SUM(is_administration) AS administration
        FROM insolvencies_record_level
    """).fetchone()

    last_12m = conn.execute("""
        SELECT COUNT(*) FROM insolvencies_record_level
        WHERE month_registered >= strftime('%Y-%m', date('now', '-12 months'))
    """).fetchone()[0]

    conn.close()

    print(f"\n[record_level] ── Summary ──")
    print(f"  Total rows      : {total:,}")
    print(f"  Date range      : {date_range[0]} → {date_range[1]}")
    print(f"  Last 12 months  : {last_12m:,}")
    print(f"  CVL             : {int(bucket[0] or 0):,}")
    print(f"  Compulsory      : {int(bucket[1] or 0):,}")
    print(f"  Administration  : {int(bucket[2] or 0):,}")
    print(f"  Top 5 SIC-2 codes:")
    for sic, n in top_sic:
        label = SIC2_LABELS.get(str(sic), "")
        print(f"    {str(sic):>4}  {n:>7,}  {label}")


def run() -> pd.DataFrame:
    url = find_record_level_url()
    df  = download_and_parse(url)
    n   = load_to_db(df, DB_PATH)
    print(f"[record_level] Inserted {n:,} rows → {DB_PATH}")
    print_summary(DB_PATH)
    return df


if __name__ == "__main__":
    run()
