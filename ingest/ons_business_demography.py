"""
ingest/ons_business_demography.py
Fetches two ONS Business Demography series and loads into SQLite.

Series 1 — Annual (Business Demography Reference Table):
  ons_demography_annual: year, active_businesses, births, deaths, birth_rate, death_rate
  Source: Table 1.1x (births), Table 2.1x (deaths), Table 3.1x (actives) — UK row K02000001
  Each table type has one sheet per year (a=2019, b=2020, …); we extract the UK row.

Series 2 — Quarterly (Business Demography Quarterly, experimental):
  ons_demography_quarterly: quarter, creations, closures, net_change
  Source: 'Births Geography Counts' + 'Deaths Geography Counts' sheets, United Kingdom column.
  We always download the latest release (first XLSX link on the dataset page).

Run:    python ingest/ons_business_demography.py
Safe to re-run — INSERT OR REPLACE upserts on primary key.
"""

import sqlite3
import warnings
from io import BytesIO
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "tracker.db"

HEADERS = {"User-Agent": "mano-tracker/0.6"}
ONS_BASE = "https://www.ons.gov.uk"

ANNUAL_PAGE = (
    "https://www.ons.gov.uk/businessindustryandtrade/business"
    "/activitysizeandlocation/datasets/businessdemographyreferencetable"
)
QUARTERLY_PAGE = (
    "https://www.ons.gov.uk/businessindustryandtrade/business"
    "/activitysizeandlocation/datasets"
    "/businessdemographyquarterlyexperimentalstatisticsuk"
)

UK_CODE = "K02000001"


# ── helpers ────────────────────────────────────────────────────────────────────

def _scrape_xlsx_url(page_url: str, keyword: str | None = None) -> str:
    """Return the first .xlsx href found on page_url (prepend ONS_BASE if relative)."""
    r = requests.get(page_url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    links = [
        a["href"] for a in soup.find_all("a", href=True)
        if ".xlsx" in a["href"].lower()
        and (keyword is None or keyword.lower() in a["href"].lower())
    ]
    if not links:
        raise RuntimeError(f"No .xlsx link found on {page_url}")
    href = links[0]
    return href if href.startswith("http") else ONS_BASE + href


def _load_xlsx(url: str) -> pd.ExcelFile:
    r = requests.get(url, headers=HEADERS, timeout=120)
    r.raise_for_status()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        return pd.ExcelFile(BytesIO(r.content), engine="openpyxl")


def _ensure_db(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)


# ── Series 1: Annual ──────────────────────────────────────────────────────────

def _extract_uk_by_year(xls: pd.ExcelFile, prefix: str) -> dict[int, float]:
    """
    For sheets like 'Table 1.1a', 'Table 1.1b', … extract the UK row value(s).
    Row 3 contains year(s) starting from col 2 onward. UK is identified by
    K02000001 in col 0. A sheet may carry multiple years (e.g. Table 1.1c has
    2021/2022/2023 in cols 2/3/4). Returns {year: value}.
    """
    results = {}
    for sheet in xls.sheet_names:
        if not sheet.startswith(prefix):
            continue
        df = xls.parse(sheet, header=None)
        # Find UK row index
        uk_mask = df.iloc[:, 0].astype(str).str.strip() == UK_CODE
        if not uk_mask.any():
            continue
        uk_row = df.loc[uk_mask].iloc[0]
        # Scan all columns from col 2 onward for year headers
        year_row = df.iloc[3]
        for col_idx in range(2, len(year_row)):
            try:
                year = int(float(year_row.iloc[col_idx]))
            except (ValueError, TypeError):
                continue
            try:
                value = float(uk_row.iloc[col_idx])
                results[year] = value
            except (ValueError, TypeError):
                pass
    return results


def ingest_annual(db_path: Path = DB_PATH) -> int:
    print("[ons_annual] Finding annual XLSX on ONS…")
    xlsx_url = _scrape_xlsx_url(ANNUAL_PAGE)
    print(f"[ons_annual] Downloading: {xlsx_url}")
    xls = _load_xlsx(xlsx_url)
    print(f"[ons_annual] Sheets: {len(xls.sheet_names)}")

    births  = _extract_uk_by_year(xls, "Table 1.1")   # births per year
    deaths  = _extract_uk_by_year(xls, "Table 2.1")   # deaths per year
    actives = _extract_uk_by_year(xls, "Table 3.1")   # active businesses per year

    years = sorted(set(births) | set(deaths) | set(actives))
    print(f"[ons_annual] Years found: {years}")

    rows = []
    for yr in years:
        b = births.get(yr)
        d = deaths.get(yr)
        a = actives.get(yr)
        if b is None or d is None or a is None or a == 0:
            print(f"[ons_annual] WARNING: incomplete data for {yr}, skipping")
            continue
        rows.append({
            "year":              yr,
            "active_businesses": int(a),
            "births":            int(b),
            "deaths":            int(d),
            "birth_rate":        round(b / a, 6),
            "death_rate":        round(d / a, 6),
        })

    _ensure_db(db_path)
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ons_demography_annual (
            year              INTEGER PRIMARY KEY,
            active_businesses INTEGER,
            births            INTEGER,
            deaths            INTEGER,
            birth_rate        REAL,
            death_rate        REAL,
            source            TEXT DEFAULT 'ons_annual'
        )
    """)
    upserted = 0
    for row in rows:
        conn.execute("""
            INSERT OR REPLACE INTO ons_demography_annual
              (year, active_businesses, births, deaths, birth_rate, death_rate, source)
            VALUES (?,?,?,?,?,?,?)
        """, (row["year"], row["active_businesses"], row["births"],
              row["deaths"], row["birth_rate"], row["death_rate"], "ons_annual"))
        upserted += 1
    conn.commit()
    conn.close()
    print(f"[ons_annual] Upserted {upserted} rows → {db_path}")
    return upserted


# ── Series 2: Quarterly ───────────────────────────────────────────────────────

def ingest_quarterly(db_path: Path = DB_PATH) -> int:
    print("[ons_quarterly] Finding quarterly XLSX on ONS…")
    xlsx_url = _scrape_xlsx_url(QUARTERLY_PAGE)
    print(f"[ons_quarterly] Downloading: {xlsx_url}")
    xls = _load_xlsx(xlsx_url)
    print(f"[ons_quarterly] Sheets: {xls.sheet_names}")

    def _parse_geo_sheet(sheet_name: str) -> pd.Series:
        """Parse a Geography Counts sheet; return Series indexed by quarter label."""
        df = xls.parse(sheet_name, header=None)
        # Row 3 = header: Quarter | United Kingdom | Great Britain | …
        header_row = df.iloc[3].astype(str).str.strip().tolist()
        # Find 'United Kingdom' column (case-insensitive)
        uk_col = None
        for i, h in enumerate(header_row):
            if "united kingdom" in h.lower():
                uk_col = i
                break
        if uk_col is None:
            raise RuntimeError(f"Cannot find 'United Kingdom' column in {sheet_name}")
        # Data starts row 4; col 0 = quarter label, uk_col = value
        data = df.iloc[4:, [0, uk_col]].copy()
        data.columns = ["quarter", "value"]
        data = data.dropna(subset=["quarter"])
        data["quarter"] = data["quarter"].astype(str).str.strip()
        data = data[data["quarter"].str.match(r"Q\d \d{4}")]
        data["value"] = pd.to_numeric(data["value"], errors="coerce")
        return data.set_index("quarter")["value"]

    births_s = _parse_geo_sheet("Births Geography Counts")
    deaths_s = _parse_geo_sheet("Deaths Geography Counts")

    quarters = sorted(set(births_s.index) | set(deaths_s.index))
    print(f"[ons_quarterly] Quarters found: {len(quarters)} "
          f"({quarters[0] if quarters else '?'} → {quarters[-1] if quarters else '?'})")

    _ensure_db(db_path)
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ons_demography_quarterly (
            quarter    TEXT PRIMARY KEY,
            creations  INTEGER,
            closures   INTEGER,
            net_change INTEGER,
            source     TEXT DEFAULT 'ons_quarterly'
        )
    """)
    upserted = 0
    for q in quarters:
        c = births_s.get(q)
        d = deaths_s.get(q)
        if pd.isna(c) or pd.isna(d):
            continue
        creations = int(c)
        closures  = int(d)
        conn.execute("""
            INSERT OR REPLACE INTO ons_demography_quarterly
              (quarter, creations, closures, net_change, source)
            VALUES (?,?,?,?,?)
        """, (q, creations, closures, creations - closures, "ons_quarterly"))
        upserted += 1
    conn.commit()
    conn.close()
    print(f"[ons_quarterly] Upserted {upserted} rows → {db_path}")
    return upserted


# ── main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    annual_ok = quarterly_ok = False
    try:
        ingest_annual()
        annual_ok = True
    except Exception as e:
        print(f"[ons_annual] ERROR: {e}")

    try:
        ingest_quarterly()
        quarterly_ok = True
    except Exception as e:
        print(f"[ons_quarterly] ERROR: {e}")

    print(f"\n[ons_demography] Done — annual={'OK' if annual_ok else 'FAILED'}, "
          f"quarterly={'OK' if quarterly_ok else 'FAILED'}")


if __name__ == "__main__":
    main()
