"""
ingest/gazette_backfill.py
One-off historical backfill of Gazette insolvency notices (2020-01-01 → today).

The daily Atom feed (ingest/gazette_notices.py) only returns the most recent
~200 notices. This script walks the same public endpoint with explicit
publish-date windows and pagination to recover the full history for:
  2443 = liquidator appointments
  2450 = winding-up petitions

Output: data/gazette_backfill.csv  (committed to git as a seed — tracker.db
is NOT in git, CI rebuilds it from scratch and loads this CSV first).

Pagination: the feed's <link rel="next"> points at an internal host, so we
paginate by incrementing results-page until a page comes back empty. The
server caps page size at 100 regardless of the requested value.

Run:  python ingest/gazette_backfill.py
Resumable: skips months already present in the CSV (by published_date).
"""

import re
import time
from datetime import date
from pathlib import Path

import feedparser
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
OUT_CSV = ROOT / "data" / "gazette_backfill.csv"

BASE_URL = "https://www.thegazette.co.uk/all-notices/notice/data.feed"
HEADERS = {"User-Agent": "mano-tracker/0.6"}
PAGE_SIZE = 100          # server-side cap; asking for more still returns 100
SLEEP_BETWEEN = 2.5      # seconds between requests
BACKOFF = [10, 30, 60, 120]   # retry delays on 202/429/503
# The Gazette returns HTTP 202 with an empty feed when throttling — it is a
# rate-limit signal, NOT an empty result, and must be retried.
THROTTLE_STATUSES = {202, 429, 503}
START = date(2020, 1, 1)

CSV_COLUMNS = ["notice_id", "published_date", "notice_type",
               "company_name", "company_number", "edition"]

EDITION_PATTERN = re.compile(r"/(london|edinburgh|belfast)/", re.IGNORECASE)
COMPANY_NUMBER_PATTERN = re.compile(r"\b(\d{8})\b")


def month_windows(start: date, end: date) -> list[tuple[date, date]]:
    """Yield (first_day, last_day) for each month from start to end inclusive."""
    windows = []
    cur = date(start.year, start.month, 1)
    while cur <= end:
        nxt = date(cur.year + (cur.month == 12), cur.month % 12 + 1, 1)
        last_day = min(nxt - pd.Timedelta(days=1).to_pytimedelta(), end)
        windows.append((cur, last_day))
        cur = nxt
    return windows


def fetch_page(window_start: date, window_end: date, page: int):
    """Fetch one feed page with retry/backoff. Returns feed or None on failure."""
    url = (f"{BASE_URL}?categorycode=13&noticetypes=2443,2450"
           f"&start-publish-date={window_start:%Y-%m-%d}"
           f"&end-publish-date={window_end:%Y-%m-%d}"
           f"&results-page-size={PAGE_SIZE}&results-page={page}")
    for attempt, delay in enumerate([0] + BACKOFF):
        if delay:
            print(f"[backfill]   retry in {delay}s (attempt {attempt})")
            time.sleep(delay)
        feed = feedparser.parse(url, request_headers=HEADERS)
        status = getattr(feed, "status", None)
        if status in THROTTLE_STATUSES:
            continue
        if status and status >= 400:
            print(f"[backfill]   HTTP {status} for {window_start:%Y-%m} p{page} — skipping page")
            return None
        return feed
    print(f"[backfill]   gave up on {window_start:%Y-%m} p{page} after retries (throttled)")
    return None


def parse_entry(e) -> dict:
    notice_id = (e.get("id") or "").rstrip("/").rsplit("/", 1)[-1]
    blob = " ".join(str(e.get(k, "")) for k in ("summary", "content"))
    num_match = COMPANY_NUMBER_PATTERN.search(blob)
    ed_match = EDITION_PATTERN.search(e.get("id") or "")
    return {
        "notice_id":      notice_id,
        "published_date": (e.get("published") or "")[:10],
        "notice_type":    str(e.get("f_notice-code", "")).strip(),
        "company_name":   (e.get("title") or "").strip(),
        "company_number": num_match.group(1) if num_match else None,
        "edition":        ed_match.group(1).title() if ed_match else None,
    }


def fetch_window(window_start: date, window_end: date) -> list[dict]:
    rows = []
    page = 1
    while True:
        feed = fetch_page(window_start, window_end, page)
        if feed is None or not feed.entries:
            break
        rows.extend(parse_entry(e) for e in feed.entries)
        # Stop when the server says this is the last page.
        last_page = None
        for l in feed.feed.get("links", []):
            if l.get("rel") == "last":
                m = re.search(r"results-page=(\d+)", l.get("href", ""))
                last_page = int(m.group(1)) if m else None
        if last_page is not None and page >= last_page:
            break
        page += 1
        time.sleep(SLEEP_BETWEEN)
    return rows


def load_existing() -> pd.DataFrame:
    if OUT_CSV.exists():
        return pd.read_csv(OUT_CSV, dtype=str)
    return pd.DataFrame(columns=CSV_COLUMNS)


def main() -> None:
    today = date.today()
    existing = load_existing()
    done_months = set()
    if not existing.empty:
        done_months = set(existing["published_date"].astype(str).str[:7])
        print(f"[backfill] Resuming — CSV already has {len(existing)} rows "
              f"({len(done_months)} months covered)")

    all_rows = existing.to_dict("records")
    windows = month_windows(START, today)
    current_month = f"{today:%Y-%m}"

    for w_start, w_end in windows:
        month_key = f"{w_start:%Y-%m}"
        # Always refetch the current (incomplete) month; skip completed ones.
        if month_key in done_months and month_key != current_month:
            continue
        try:
            rows = fetch_window(w_start, w_end)
            all_rows.extend(rows)
            print(f"[backfill] {month_key}: {len(rows)} notices")
        except Exception as exc:
            print(f"[backfill] {month_key}: ERROR {exc} — continuing")
        time.sleep(SLEEP_BETWEEN)

        # Checkpoint after every month so an interrupted run is resumable.
        df = pd.DataFrame(all_rows, columns=CSV_COLUMNS)
        df = df.drop_duplicates(subset="notice_id", keep="last")
        df = df.sort_values("published_date")
        df.to_csv(OUT_CSV, index=False)

    df = pd.DataFrame(all_rows, columns=CSV_COLUMNS)
    df = df.drop_duplicates(subset="notice_id", keep="last").sort_values("published_date")
    df.to_csv(OUT_CSV, index=False)
    print(f"\n[backfill] ── Summary ──")
    print(f"  Total rows   : {len(df)}")
    print(f"  Date range   : {df['published_date'].min()} → {df['published_date'].max()}")
    print(f"  Petitions    : {(df['notice_type'] == '2450').sum()}")
    print(f"  Appointments : {(df['notice_type'] == '2443').sum()}")
    print(f"  Output       : {OUT_CSV}")


if __name__ == "__main__":
    main()
