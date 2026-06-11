"""
ingest/caselaw_feed.py
Polls the Find Case Law Atom feed for judgments where Manolete Partners
is a party, and loads results into SQLite table: judgments.
"""

import sqlite3
from pathlib import Path

import feedparser

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "tracker.db"

FEED_URL = (
    "https://caselaw.nationalarchives.gov.uk/atom.xml"
    "?query=manolete+partners&order=date"
)


def fetch_feed() -> list[dict]:
    feed = feedparser.parse(FEED_URL)
    entries = []
    for e in feed.entries:
        # Date: prefer published, fall back to updated
        date_raw = e.get("published") or e.get("updated") or ""
        date = date_raw[:10] if date_raw else None

        summary = e.get("summary", "") or ""
        # Strip basic HTML tags for plain-text storage
        import re
        summary_clean = re.sub(r"<[^>]+>", " ", summary).strip()
        summary_clean = re.sub(r"\s+", " ", summary_clean)[:500]

        entries.append({
            "date":          date,
            "case_name":     e.get("title", "").strip(),
            "url":           e.get("link", "").strip(),
            "outcome_notes": summary_clean or None,
        })
    return entries


def load_to_db(entries: list[dict], db_path: Path) -> int:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS judgments (
            url           TEXT PRIMARY KEY,
            date          TEXT,
            case_name     TEXT,
            outcome_notes TEXT
        )
    """)
    inserted = 0
    for e in entries:
        cur = conn.execute("""
            INSERT OR IGNORE INTO judgments (url, date, case_name, outcome_notes)
            VALUES (?,?,?,?)
        """, (e["url"], e["date"], e["case_name"], e["outcome_notes"]))
        inserted += cur.rowcount
    conn.commit()
    conn.close()
    return inserted


def print_summary(entries: list[dict], inserted: int) -> None:
    dates = [e["date"] for e in entries if e["date"]]
    print(f"\n[caselaw] ── Summary ──")
    print(f"  Entries fetched   : {len(entries)}")
    print(f"  New rows inserted : {inserted}")
    if dates:
        print(f"  Date range        : {min(dates)} → {max(dates)}")
    print(f"  Cases found:")
    for e in entries:
        print(f"    {e['date'] or 'N/A':>10}  {e['case_name']}")


def run() -> list[dict]:
    print("[caselaw] Fetching case law feed…")
    entries  = fetch_feed()
    inserted = load_to_db(entries, DB_PATH)
    print_summary(entries, inserted)
    return entries


if __name__ == "__main__":
    run()
