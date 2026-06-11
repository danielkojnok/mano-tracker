"""
ingest/boe_bank_rate.py
Fetches Bank of England Bank Rate history from the BoE IADB CSV endpoint.

Series: IUDBEDR (official Bank Rate, effective date).
Run:    python ingest/boe_bank_rate.py
Safe to re-run — INSERT OR REPLACE upserts on date PK.
"""

import sqlite3
from io import StringIO
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "tracker.db"

URL = (
    "https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp"
    "?csv.x=yes&SeriesCodes=IUDBEDR&UsingCodes=Y&CSVF=TN"
    "&Datefrom=01/Jan/2000&Dateto=01/Jan/2027"
)
HEADERS = {"User-Agent": "mano-tracker/0.6"}


def fetch_rate() -> pd.DataFrame:
    print("[boe_bank_rate] Fetching Bank Rate from BoE IADB…")
    resp = requests.get(URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()

    # The CSV has a header row; BoE format: "DATE","IUDBEDR"
    # Date format varies (e.g. "04 Jan 2000") — parse flexibly.
    df = pd.read_csv(StringIO(resp.text))
    print(f"[boe_bank_rate] Raw columns: {df.columns.tolist()}")

    # Normalise column names regardless of exact BoE header text.
    df.columns = [c.strip().strip('"') for c in df.columns]
    date_col  = df.columns[0]   # first col is always date
    rate_col  = df.columns[1]   # second col is the rate series

    df = df[[date_col, rate_col]].rename(columns={date_col: "date", rate_col: "rate"})
    df["date"] = pd.to_datetime(df["date"], dayfirst=True, errors="coerce")
    df["rate"] = pd.to_numeric(df["rate"], errors="coerce")
    df = df.dropna(subset=["date", "rate"])
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")
    df = df.sort_values("date").reset_index(drop=True)
    print(f"[boe_bank_rate] Parsed {len(df)} rows, "
          f"{df['date'].min()} → {df['date'].max()}")
    return df


def load_to_db(df: pd.DataFrame, db_path: Path) -> int:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS boe_bank_rate (
            date TEXT PRIMARY KEY,
            rate REAL
        )
    """)
    upserted = 0
    for _, row in df.iterrows():
        conn.execute(
            "INSERT OR REPLACE INTO boe_bank_rate (date, rate) VALUES (?,?)",
            (row["date"], row["rate"]),
        )
        upserted += 1
    conn.commit()
    conn.close()
    return upserted


def run() -> pd.DataFrame:
    df = fetch_rate()
    n  = load_to_db(df, DB_PATH)
    print(f"[boe_bank_rate] Upserted {n} rows → {DB_PATH}")
    return df


if __name__ == "__main__":
    run()
