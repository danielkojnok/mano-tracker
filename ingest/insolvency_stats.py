"""
ingest/insolvency_stats.py
Downloads the Insolvency Service Long-Run CSV and loads it into SQLite.
"""

import sqlite3
import io
import re
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "tracker.db"

RELEASE_PAGE = "https://www.gov.uk/government/statistics/company-insolvencies-march-2026"


def find_longrun_csv_url() -> str:
    resp = requests.get(RELEASE_PAGE, timeout=15)
    resp.raise_for_status()
    matches = re.findall(
        r'https://assets\.publishing\.service\.gov\.uk[^"\']+(?<!Metadata_for_)Long[^"\']+\.csv',
        resp.text,
    )
    matches = [m for m in matches if "Metadata" not in m]
    if matches:
        print(f"[insolvency_stats] Found CSV: {matches[0]}")
        return matches[0]
    raise RuntimeError("Could not find Long-Run CSV on release page")


def download_and_parse(url: str) -> pd.DataFrame:
    print("[insolvency_stats] Downloading...")
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()

    raw = pd.read_csv(io.StringIO(resp.text), header=None)

    header_idx = 3
    for i, row in raw.iterrows():
        if any(str(v).strip().lower() in ("period", "date") for v in row.values):
            header_idx = i
            break

    df = pd.read_csv(io.StringIO(resp.text), skiprows=header_idx)
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]

    period_col = df.columns[0]
    df = df.rename(columns={period_col: "period"})
    df = df[df["period"].astype(str).str.match(r"^\d{4}")]

    def to_date(p):
        p = str(p).strip()
        if re.match(r"\d{4}-\d{2}$", p):
            return pd.Timestamp(p + "-01")
        try:
            return pd.to_datetime(p)
        except Exception:
            return pd.NaT

    df["date"] = df["period"].apply(to_date)
    df = df.dropna(subset=["date"])
    df["date"] = df["date"].dt.strftime("%Y-%m-01")

    for col in df.columns:
        if col not in ("period", "date"):
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Pick one canonical column per metric (prefer _ew_nsa seasonally-unadjusted England+Wales)
    def pick(candidates):
        for c in candidates:
            if c in df.columns:
                return c
        return None

    col_map = {}
    cvl_col = pick(["cvl_ew_nsa", "cvl_ew_sa", "cvl_nsa", "cvl"])
    comp_col = pick(["compliq_ew_nsa", "compliq_ew_sa", "compliq_nsa", "compulsory"])
    admin_col = pick(["admin_ew_nsa", "admin_ew_sa", "admin_nsa", "administration"])
    cva_col = pick(["cva_ew_nsa", "cva_nsa", "cva"])
    rec_col = pick(["rec_ew_nsa", "rec_nsa", "receivership"])
    total_col = pick(["total_ew_nsa", "total_ew_sa", "total_nsa", "total"])

    for src, dst in [(cvl_col, "cvl"), (comp_col, "compulsory"), (admin_col, "administration"),
                     (cva_col, "cva"), (rec_col, "receivership"), (total_col, "total")]:
        if src and src != dst:
            col_map[src] = dst

    keep = {"period", "date"}
    for src, dst in col_map.items():
        keep.add(dst)
    for col in [cvl_col, comp_col, admin_col, cva_col, rec_col, total_col]:
        if col:
            keep.add(col)

    df = df.rename(columns=col_map)
    out_cols = ["period", "date"] + [c for c in ["cvl", "compulsory", "administration", "cva", "receivership", "total"] if c in df.columns]
    return df[out_cols]


def load_to_db(df: pd.DataFrame, db_path: Path) -> int:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS insolvencies_monthly (
            date           TEXT PRIMARY KEY,
            cvl            REAL,
            compulsory     REAL,
            administration REAL,
            cva            REAL,
            receivership   REAL,
            total          REAL,
            source         TEXT DEFAULT 'insolvency_service'
        )
    """)
    rows = 0
    for _, row in df.iterrows():
        def val(col):
            return row[col] if col in row.index else None

        conn.execute(
            """INSERT OR REPLACE INTO insolvencies_monthly
               (date, cvl, compulsory, administration, cva, receivership, total)
               VALUES (?,?,?,?,?,?,?)""",
            (
                val("date"),
                val("cvl"),
                val("compulsory"),
                val("administration"),
                val("cva"),
                val("receivership"),
                val("total"),
            ),
        )
        rows += 1
    conn.commit()
    conn.close()
    return rows


def run() -> pd.DataFrame:
    url = find_longrun_csv_url()
    df = download_and_parse(url)
    n = load_to_db(df, DB_PATH)
    print(f"[insolvency_stats] Loaded {n} rows → {DB_PATH}")
    cols = [c for c in ["date", "cvl", "compulsory", "total"] if c in df.columns]
    print(df.tail(3)[cols].to_string(index=False))
    return df


if __name__ == "__main__":
    run()
