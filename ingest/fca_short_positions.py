"""
ingest/fca_short_positions.py
Downloads the FCA daily short positions XLSX and filters for MANO.L.

Defensive design — the FCA is changing its regime on 13 July 2026:
  - threshold drops 0.5% → 0.2%
  - position holder identity may disappear (aggregated "ANSP" format)
  - column names / sheet layout may change

This script discovers columns by keyword matching (case-insensitive) and
never hard-codes column positions. If a column is missing it logs a warning
and stores what it can rather than crashing.

Run:    python ingest/fca_short_positions.py
Safe to re-run — INSERT OR REPLACE upserts on (date, position_holder, issuer).
"""

import sqlite3
import warnings
from io import BytesIO
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "tracker.db"

URL = "https://www.fca.org.uk/publication/data/short-positions-daily-update.xlsx"
HEADERS = {"User-Agent": "mano-tracker/0.6"}

# MANO.L ISIN (verified: Companies House / LSE listing documents)
MANO_ISIN = "GB00BYWWHR75"

# Keywords used to locate columns by best-match (case-insensitive substring).
COL_KEYWORDS = {
    "issuer":   ["issuer", "company name", "company", "name"],
    "isin":     ["isin"],
    "holder":   ["position holder", "holder", "fund", "manager", "investor"],
    "short":    ["net short position", "short position", "position %", "short %", "position"],
    "date":     ["position date", "date"],
}


def _find_col(columns: list[str], keywords: list[str]) -> str | None:
    """Return first column name whose lower-case form contains any keyword."""
    cols_lower = [c.lower() for c in columns]
    for kw in keywords:
        for i, cl in enumerate(cols_lower):
            if kw in cl:
                return columns[i]
    return None


def fetch_positions() -> pd.DataFrame:
    print("[fca_short] Downloading FCA short positions XLSX…")
    resp = requests.get(URL, headers=HEADERS, timeout=60)
    resp.raise_for_status()

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")   # suppress openpyxl style warnings
        xls = pd.ExcelFile(BytesIO(resp.content), engine="openpyxl")

    # Try first sheet (FCA consistently uses sheet 1 for the data).
    sheet = xls.sheet_names[0]
    df = xls.parse(sheet)
    print(f"[fca_short] Sheet '{sheet}' — columns: {df.columns.tolist()}")

    # Discover columns by keyword matching.
    col_issuer = _find_col(df.columns.tolist(), COL_KEYWORDS["issuer"])
    col_isin   = _find_col(df.columns.tolist(), COL_KEYWORDS["isin"])
    col_holder = _find_col(df.columns.tolist(), COL_KEYWORDS["holder"])
    col_short  = _find_col(df.columns.tolist(), COL_KEYWORDS["short"])
    col_date   = _find_col(df.columns.tolist(), COL_KEYWORDS["date"])

    print(f"[fca_short] Mapped → issuer={col_issuer!r}, isin={col_isin!r}, "
          f"holder={col_holder!r}, short={col_short!r}, date={col_date!r}")

    for name, val in [("issuer", col_issuer), ("short", col_short), ("date", col_date)]:
        if val is None:
            print(f"[fca_short] WARNING: could not find '{name}' column — "
                  "schema may have changed. Storing what is available.")

    # Filter for MANO — by ISIN first, then fall back to issuer name.
    mask = pd.Series([False] * len(df), index=df.index)
    if col_isin:
        mask |= df[col_isin].astype(str).str.upper().str.strip() == MANO_ISIN
    if col_issuer:
        mask |= df[col_issuer].astype(str).str.lower().str.contains("manolete", na=False)

    mano = df[mask].copy()
    print(f"[fca_short] MANO rows found: {len(mano)}")
    if mano.empty:
        print("[fca_short] No MANO rows — returning empty frame (no DB write needed).")
        return pd.DataFrame(columns=["date", "position_holder", "issuer", "isin", "short_percent"])

    # Build normalised output frame.
    out = pd.DataFrame()
    out["date"]             = pd.to_datetime(mano[col_date], errors="coerce").dt.strftime("%Y-%m-%d") if col_date   else None
    out["position_holder"]  = mano[col_holder].astype(str).str.strip()                                 if col_holder else ""
    out["issuer"]           = mano[col_issuer].astype(str).str.strip()                                 if col_issuer else ""
    out["isin"]             = mano[col_isin].astype(str).str.strip()                                   if col_isin   else ""
    out["short_percent"]    = pd.to_numeric(mano[col_short], errors="coerce")                          if col_short  else None

    out = out.dropna(subset=["date"])
    return out.reset_index(drop=True)


def load_to_db(df: pd.DataFrame, db_path: Path) -> int:
    if df.empty:
        return 0
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS fca_short_positions (
            date             TEXT,
            position_holder  TEXT,
            issuer           TEXT,
            isin             TEXT,
            short_percent    REAL,
            PRIMARY KEY (date, position_holder, issuer)
        )
    """)
    upserted = 0
    for _, row in df.iterrows():
        conn.execute("""
            INSERT OR REPLACE INTO fca_short_positions
              (date, position_holder, issuer, isin, short_percent)
            VALUES (?,?,?,?,?)
        """, (
            row["date"],
            row.get("position_holder", ""),
            row.get("issuer", ""),
            row.get("isin", ""),
            row.get("short_percent"),
        ))
        upserted += 1
    conn.commit()
    conn.close()
    return upserted


def ensure_table(db_path: Path) -> None:
    """Always create the table schema, even when there are no MANO rows today."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS fca_short_positions (
            date             TEXT,
            position_holder  TEXT,
            issuer           TEXT,
            isin             TEXT,
            short_percent    REAL,
            PRIMARY KEY (date, position_holder, issuer)
        )
    """)
    conn.commit()
    conn.close()


def run() -> pd.DataFrame:
    ensure_table(DB_PATH)
    df = fetch_positions()
    n  = load_to_db(df, DB_PATH)
    print(f"[fca_short] Upserted {n} MANO rows → {DB_PATH}")
    return df


if __name__ == "__main__":
    run()
