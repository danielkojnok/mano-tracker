"""
ingest/companies_house.py
Enriches recent insolvency records with Companies House company profiles.

Rate limit: 600 req / 5 min → sleep 0.6s between requests (safe at ~1.67/s).
First run: most recent 500 companies (month_registered >= 2025-09).
Subsequent runs: only company_numbers not yet in companies_house_profiles.
"""

import json
import os
import sqlite3
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "tracker.db"

load_dotenv(ROOT / ".env")

BASE_URL   = "https://api.company-information.service.gov.uk"
BATCH_SIZE = 500
SINCE_MONTH = "2025-09"
SLEEP_BETWEEN = 0.6   # seconds — keeps us safely under 2 req/sec
SLEEP_ON_429  = 30    # seconds — back-off on rate-limit response


def get_api_key() -> str:
    key = os.getenv("COMPANIES_HOUSE_API_KEY", "").strip()
    if not key:
        raise RuntimeError(
            "COMPANIES_HOUSE_API_KEY not set. Add it to .env or environment."
        )
    return key


def create_table(conn: sqlite3.Connection) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS companies_house_profiles (
            company_number              TEXT PRIMARY KEY,
            company_name                TEXT,
            company_status              TEXT,
            date_of_creation            TEXT,
            sic_codes                   TEXT,
            registered_office_address   TEXT,
            last_fetched                TEXT
        )
    """)
    conn.commit()


def get_pending(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute(f"""
        SELECT DISTINCT r.company_number
        FROM insolvencies_record_level r
        WHERE r.month_registered >= ?
          AND NOT EXISTS (
              SELECT 1 FROM companies_house_profiles p
              WHERE p.company_number = r.company_number
          )
        ORDER BY r.month_registered DESC
        LIMIT {BATCH_SIZE}
    """, (SINCE_MONTH,)).fetchall()
    return [r[0] for r in rows]


def fetch_company(company_number: str, api_key: str) -> dict | None:
    url = f"{BASE_URL}/company/{company_number}"
    for attempt in (1, 2):
        try:
            resp = requests.get(url, auth=(api_key, ""), timeout=10)
        except requests.RequestException as exc:
            print(f"  [CH] {company_number} — request error: {exc}")
            return None

        if resp.status_code == 200:
            return resp.json()
        if resp.status_code == 404:
            return {"company_status": "NOT_FOUND"}
        if resp.status_code == 429 and attempt == 1:
            print(f"  [CH] 429 rate-limit — sleeping {SLEEP_ON_429}s…")
            time.sleep(SLEEP_ON_429)
            continue
        print(f"  [CH] {company_number} — HTTP {resp.status_code}, skipping")
        return None
    return None


def upsert(conn: sqlite3.Connection, number: str, data: dict) -> None:
    addr = data.get("registered_office_address")
    conn.execute("""
        INSERT OR REPLACE INTO companies_house_profiles
          (company_number, company_name, company_status, date_of_creation,
           sic_codes, registered_office_address, last_fetched)
        VALUES (?,?,?,?,?,?,date('now'))
    """, (
        number,
        data.get("company_name"),
        data.get("company_status"),
        data.get("date_of_creation"),
        json.dumps(data.get("sic_codes") or []),
        json.dumps(addr) if addr else None,
    ))


def print_summary(conn: sqlite3.Connection, total_fetched: int) -> None:
    status_rows = conn.execute("""
        SELECT company_status, COUNT(*) n
        FROM companies_house_profiles
        GROUP BY company_status ORDER BY n DESC
    """).fetchall()

    # SIC codes stored as JSON arrays — explode in Python
    sic_rows = conn.execute(
        "SELECT sic_codes FROM companies_house_profiles WHERE sic_codes IS NOT NULL"
    ).fetchall()
    from collections import Counter
    sic_counter: Counter = Counter()
    for (raw,) in sic_rows:
        try:
            codes = json.loads(raw)
            for c in codes:
                if c:
                    sic_counter[str(c)] += 1
        except Exception:
            pass

    print(f"\n[CH] ── Summary ──")
    print(f"  Fetched this run  : {total_fetched}")
    print(f"  Status breakdown  :")
    for status, n in status_rows:
        print(f"    {str(status):<20} {n:,}")
    print(f"  Top 5 SIC codes (this table):")
    for sic, n in sic_counter.most_common(5):
        print(f"    {sic:>6}  {n:,}")


def run() -> None:
    api_key = get_api_key()
    conn = sqlite3.connect(DB_PATH)
    create_table(conn)

    pending = get_pending(conn)
    total = len(pending)
    print(f"[CH] {total} companies to fetch (batch limit {BATCH_SIZE}, since {SINCE_MONTH})")

    fetched = 0
    for i, number in enumerate(pending, 1):
        data = fetch_company(number, api_key)
        if data is not None:
            upsert(conn, number, data)
            fetched += 1

        if i % 50 == 0:
            conn.commit()
            print(f"  [CH] Fetched {i}/{total}…")

        time.sleep(SLEEP_BETWEEN)

    conn.commit()
    print(f"[CH] Done — {fetched}/{total} profiles stored → {DB_PATH}")
    print_summary(conn, fetched)
    conn.close()


if __name__ == "__main__":
    run()
