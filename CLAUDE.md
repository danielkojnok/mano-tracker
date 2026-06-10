# MANO Tracker — Claude Code Context

## What this project does
Tracks UK insolvency data as a ~24-month leading indicator for Manolete Partners PLC (LON: MANO.L) revenue.
CVL + compulsory liquidations today → implied MANO referrals → investments → completions → cash in ~24 months.

## Repo structure
```
ingest/
  insolvency_stats.py   # Downloads Long-Run CSV from Insolvency Service → SQLite
  mano_price.py         # MANO.L daily price via yfinance → SQLite
  rns_feed.py           # Investegate RSS → SQLite (RNS announcements)
  caselaw_feed.py       # Find Case Law Atom feed (party=manolete) → SQLite
model/
  pipeline.py           # Funnel model: CVL+compulsory → projected FY revenue
data/
  tracker.db            # SQLite (gitignored for large versions, committed for v0.1)
  mano_kpis.csv         # Seed data: MANO KPIs FY2019–FY2025 from RNS
app.py                  # Streamlit dashboard
.github/workflows/      # GitHub Actions scheduled runs
```

## Key model assumptions (change in model/pipeline.py)
- Referral rate: 4.25% of CVL+compulsory reach MANO as enquiry
- Acceptance rate: 30% of enquiries become investments
- Case duration lag: 13 months investment → completion
- Cash collection lag: 12 months completion → cash
- Revenue per case: £108,000 (FY25 baseline)

## Data sources
- Insolvency Service Long-Run CSV: auto-discovered via GOV.UK content API
- MANO.L price: yfinance ticker
- RNS: https://www.investegate.co.uk/rss.aspx?id=MANO
- Case law: https://caselaw.nationalarchives.gov.uk/atom.xml?query=manolete+partners&order=date

## Coding conventions
- All ingest functions return DataFrames, never print
- Every ingest script is idempotent (safe to re-run, no duplicates)
- DB writes use INSERT OR IGNORE or INSERT OR REPLACE
- Secrets (API keys) go in .env, never committed
- Python 3.12, dependency manager: uv
