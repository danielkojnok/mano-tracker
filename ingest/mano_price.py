"""
ingest/mano_price.py
Fetches MANO.L daily closing price via yfinance and stores in SQLite.

Run:  python ingest/mano_price.py
Safe to re-run — INSERT OR IGNORE skips existing dates.
"""

import sqlite3
from pathlib import Path

import pandas as pd
import yfinance as yf

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "tracker.db"
TICKER = "MANO.L"


def fetch_price(start: str = "2018-01-01") -> pd.DataFrame:
    print(f"[mano_price] Fetching {TICKER} from {start}…")
    df = yf.download(TICKER, start=start, progress=False, auto_adjust=True)
    df = df[["Close", "Volume"]].copy()
    df.columns = ["close", "volume"]
    df.index.name = "date"
    df = df.reset_index()
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")
    df["close"] = df["close"].round(4)
    return df


def load_to_db(df: pd.DataFrame, db_path: Path) -> int:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS mano_price (
            date    TEXT PRIMARY KEY,
            close   REAL,
            volume  INTEGER
        )
    """)
    rows = 0
    for _, row in df.iterrows():
        conn.execute(
            "INSERT OR IGNORE INTO mano_price (date, close, volume) VALUES (?,?,?)",
            (row["date"], row["close"], int(row["volume"]) if pd.notna(row["volume"]) else None),
        )
        rows += 1
    conn.commit()
    conn.close()
    return rows


def run() -> pd.DataFrame:
    df = fetch_price()
    n = load_to_db(df, DB_PATH)
    print(f"[mano_price] Loaded {n} rows → {DB_PATH}")
    return df


if __name__ == "__main__":
    run()
