"""
ingest/insolvency_stats.py
Downloads the Insolvency Service Long-Run CSV and loads it into SQLite.

Auto-discovers the current CSV URL via the GOV.UK content API so it keeps
working when a new monthly release is published.

Run:  python ingest/insolvency_stats.py
Safe to re-run — uses INSERT OR REPLACE, no duplicates.
"""

import sqlite3
import io
from pathlib import Path

import pandas as pd
import requests

# ── paths ──────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "tracker.db"

# GOV.UK content API — returns JSON with all attachment URLs for a page.
# We look for the "Long-Run Series" CSV attachment.
GOV_UK_API = (
    "https://www.gov.uk/api/content"
    "/government/collections/monthly-company-insolvency-statistics"
)

FALLBACK_CSV_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "67ca6cd0b5e95c5deb80e0af/"
    "Long_Run_Series_in_CSV_Format_-_Company_Insolvency_Statistics_"
    "February_2026.csv"
)


def find_longrun_csv_url() -> str:
    """
    Hit the GOV.UK content API to get the latest Long-Run CSV URL.
    Falls back to a hardcoded URL if the API call fails.
    """
    try:
        resp = requests.get(GOV_UK_API, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        # Walk all documents in the collection looking for the CSV
        for doc in data.get("links", {}).get("documents", []):
            doc_url = "https://www.gov.uk" + doc.get("base_path", "")
            doc_resp = requests.get(
                f"https://www.gov.uk/api/content{doc.get('base_path', '')}",
                timeout=15,
            )
            if not doc_resp.ok:
                continue
            doc_data = doc_resp.json()
            for detail in doc_data.get("details", {}).get("documents", []):
                url = detail.get("url", "")
                title = detail.get("title", "")
                if "Long-Run" in title and url.endswith(".csv"):
                    return url
    except Exception as e:
        print(f"[insolvency_stats] API discovery failed ({e}), using fallback URL")

    return FALLBACK_CSV_URL


def download_longrun_csv(url: str) -> pd.DataFrame:
    """Download the CSV and return a tidy DataFrame."""
    print(f"[insolvency_stats] Downloading: {url}")
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()

    # The CSV has some header rows — find the row with 'Date' or year columns
    raw = pd.read_csv(
        io.StringIO(resp.text),
        skiprows=3,       # first 3 rows are metadata / blank
        encoding="utf-8",
    )

    # Rename columns to match our schema
    # Typical columns: Date, CVL, Compulsory, Administration, CVA, Receivership,
    #                  Other, Total
    raw.columns = [c.strip().lower().replace(" ", "_") for c in raw.columns]

    # Keep only rows where 'date' looks like a real date (YYYY-MM or MM/YYYY)
    raw = raw.dropna(subset=["date"])
    raw = raw[raw["date"].astype(str).str.match(r"\d{4}")]  # starts with year

    # Standardise date to YYYY-MM-01
    raw["date"] = pd.to_datetime(raw["date"], format="%Y Q%q", errors="coerce").fillna(
        pd.to_datetime(raw["date"], errors="coerce")
    )
    raw = raw.dropna(subset=["date"])
    raw["date"] = raw["date"].dt.strftime("%Y-%m-01")

    # Coerce numeric columns
    for col in raw.columns:
        if col != "date":
            raw[col] = pd.to_numeric(raw[col], errors="coerce")

    return raw


def load_to_db(df: pd.DataFrame, db_path: Path) -> int:
    """
    Upsert rows into insolvencies_monthly.
    Returns number of rows written.
    """
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS insolvencies_monthly (
            date        TEXT PRIMARY KEY,
            cvl         REAL,
            compulsory  REAL,
            administration REAL,
            cva         REAL,
            receivership REAL,
            other       REAL,
            total       REAL,
            source      TEXT DEFAULT 'insolvency_service'
        )
    """)

    rows = 0
    for _, row in df.iterrows():
        conn.execute("""
            INSERT OR REPLACE INTO insolvencies_monthly
                (date, cvl, compulsory, administration, cva, receivership,
                 other, total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            row.get("date"),
            row.get("creditors'_voluntary_liquidations_(cvl)", row.get("cvl")),
            row.get("compulsory_liquidations", row.get("compulsory")),
            row.get("administrations", row.get("administration")),
            row.get("company_voluntary_arrangements_(cva)", row.get("cva")),
            row.get("receiverships", row.get("receivership")),
            row.get("other_insolvencies", row.get("other")),
            row.get("total_insolvencies", row.get("total")),
        ))
        rows += 1

    conn.commit()
    conn.close()
    return rows


def run() -> pd.DataFrame:
    """Full pipeline: discover → download → load. Returns the DataFrame."""
    url = find_longrun_csv_url()
    df = download_longrun_csv(url)
    n = load_to_db(df, DB_PATH)
    print(f"[insolvency_stats] Loaded {n} rows into {DB_PATH}")
    return df


if __name__ == "__main__":
    run()
