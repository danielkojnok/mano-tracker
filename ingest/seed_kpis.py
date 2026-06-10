"""
ingest/seed_kpis.py
Loads data/mano_kpis.csv (historical RNS KPIs) into SQLite.
Run once, then update CSV when new results come out.
"""

import sqlite3
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "tracker.db"
CSV_PATH = ROOT / "data" / "mano_kpis.csv"


def run() -> pd.DataFrame:
    df = pd.read_csv(CSV_PATH)
    df.columns = [c.strip() for c in df.columns]

    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS mano_kpis (
            fy               INTEGER PRIMARY KEY,
            revenue          REAL,
            cases_completed  INTEGER,
            new_investments  INTEGER,
            new_referrals    INTEGER,
            rev_per_case     REAL
        )
    """)
    for _, row in df.iterrows():
        conn.execute("""
            INSERT OR REPLACE INTO mano_kpis
                (fy, revenue, cases_completed, new_investments, new_referrals, rev_per_case)
            VALUES (?,?,?,?,?,?)
        """, (
            int(row["fy"]),
            float(row["revenue"]),
            int(row["cases_completed"]),
            int(row["new_investments"]) if pd.notna(row.get("new_investments")) else None,
            int(row["new_referrals"]) if pd.notna(row.get("new_referrals")) else None,
            float(row["rev_per_case"]) if pd.notna(row.get("rev_per_case")) else None,
        ))
    conn.commit()
    conn.close()
    print(f"[seed_kpis] Loaded {len(df)} FY rows → {DB_PATH}")
    return df


if __name__ == "__main__":
    run()
