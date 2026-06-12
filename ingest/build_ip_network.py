"""
ingest/build_ip_network.py
Aggregates ch_insolvency_enrichment.csv per insolvency practitioner (IP)
into the ip_network table in tracker.db.

Columns produced per IP:
  ip_name, total_cases, primary_region, sweet_spot_cases,
  cases_by_year (JSON TEXT), pct_sweet_spot
"""

import json
import sqlite3
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "data" / "ch_insolvency_enrichment.csv"
DB_PATH = ROOT / "data" / "tracker.db"

SWEET_SPOT_YEARS = range(2016, 2020)  # 2016–2019 inclusive


def build_ip_network() -> pd.DataFrame:
    df = pd.read_csv(CSV_PATH, dtype=str)

    # Normalise IP name
    df["ip_name"] = df["ip_name"].str.strip()
    df = df[df["ip_name"].notna() & (df["ip_name"] != "")]
    df["ip_name"] = df["ip_name"].fillna("UNKNOWN")

    # Postcode prefix: first 1–2 uppercase letters
    df["pc_area"] = (
        df["ip_postal_code"]
        .str.strip()
        .str.extract(r"^([A-Z]{1,2})", expand=False)
    )

    # Incorporation year
    df["year_inc"] = pd.to_datetime(
        df["date_of_creation"], errors="coerce"
    ).dt.year

    records = []
    for ip_name, grp in df.groupby("ip_name", sort=False):
        total_cases = len(grp)

        # Primary region: most common postcode prefix
        primary_region = grp["pc_area"].mode()
        primary_region = primary_region.iloc[0] if not primary_region.empty else None

        # Sweet-spot cohort 2016–2019
        sweet_spot_cases = int(grp["year_inc"].isin(SWEET_SPOT_YEARS).sum())

        # cases_by_year JSON
        year_counts = (
            grp["year_inc"]
            .dropna()
            .astype(int)
            .value_counts()
            .sort_index()
            .to_dict()
        )
        cases_by_year = json.dumps({str(k): v for k, v in year_counts.items()})

        pct_sweet_spot = round(sweet_spot_cases / total_cases * 100, 1) if total_cases else 0.0

        records.append({
            "ip_name": ip_name,
            "total_cases": total_cases,
            "primary_region": primary_region,
            "sweet_spot_cases": sweet_spot_cases,
            "pct_sweet_spot": pct_sweet_spot,
            "cases_by_year": cases_by_year,
        })

    result = (
        pd.DataFrame(records)
        .sort_values("total_cases", ascending=False)
        .reset_index(drop=True)
    )
    return result


def write_to_db(df: pd.DataFrame) -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DROP TABLE IF EXISTS ip_network")
    conn.execute("""
        CREATE TABLE ip_network (
            ip_name          TEXT PRIMARY KEY,
            total_cases      INTEGER,
            primary_region   TEXT,
            sweet_spot_cases INTEGER,
            pct_sweet_spot   REAL,
            cases_by_year    TEXT
        )
    """)
    df.to_sql("ip_network", conn, if_exists="append", index=False)
    conn.commit()
    conn.close()


def main() -> None:
    print("[ip_network] Building IP network table...")
    df = build_ip_network()

    distinct_ips = len(df)
    top_ip = df.iloc[0]
    print(f"[ip_network] Distinct IPs: {distinct_ips:,}")
    print(f"[ip_network] Top IP: {top_ip['ip_name']} — {top_ip['total_cases']:,} cases")

    write_to_db(df)
    print(f"[ip_network] Written to tracker.db — ip_network table ({len(df):,} rows)")

    print("\n── Top 10 IPs by case count ──")
    print(
        df[["ip_name", "total_cases", "primary_region", "sweet_spot_cases", "pct_sweet_spot"]]
        .head(10)
        .to_string(index=False)
    )


if __name__ == "__main__":
    main()
