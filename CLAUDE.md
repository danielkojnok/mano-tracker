# MANO Tracker — Claude Code Context
*Posledná aktualizácia: jún 2026*

## Čo robí
Sleduje UK insolvency dáta ako ~24-mesačný leading indicator pre Manolete Partners PLC (LON: MANO.L).
Repo: https://github.com/danielkojnok/mano-tracker

## Pipeline logika
CVL + compulsory liquidations → referrals (4.25%) → acceptance (30%) → investments → completions (13m) → cash (12m) = ~25m total lag

## Key model assumptions (pipeline.py v0.2)
| Parameter | Hodnota | Zdroj |
|-----------|---------|-------|
| REFERRAL_RATE | 4.25% | CH enrichment: aplikovať na boutique pool (82.4% trhu), nie celkový trh |
| ACCEPTANCE_RATE | 30% | MANO historické |
| CASE_LAG | 13 mesiacov | MANO H1 FY25 (13.3m priemer, 1064 cases) |
| CASH_LAG | 12 mesiacov | MANO reporting |
| TOTAL_LAG | 25 mesiacov | Validované: LCM peer benchmark 25-27m |
| LAG_UNCERTAINTY | +9m/-4m | Asymetrické — duration creep industry-wide |
| ARRCC_BASE | £110k | FY25 baseline; mix shift k väčším prípadom |
| COMPULSORY_WEIGHT | 1.25 | Znížené z 1.30 — OR podiel 17.6% (CH enrichment) |

## Kalibračné zistenia — CH enrichment (jún 2026, 45 000 firiem)
- **Boutique IP: 82.4%** prípadov — hlavný MANO referral channel
- **Top boutique IP**: Jamie Playford (934), Rikki Burton (864), Richard Hunt (760)
- **Sweet spot kohorta 2016-2019**: 11 055 gazette-validovaných boutique prípadov (33% poolu)
- **Gazette coverage**: 85% celkovo, 92.3% boutique sweet-spot
- **OR/large firm podiel**: 17.6% — štruktúrne nižší referral rate k MANO

## Peer benchmarks (jún 2026)
| Metrika | MANO | LCM | Burford | Omni |
|---------|------|-----|---------|------|
| Duration → cash | ~25m | 25-27m ✓ | ~31m | dlhšie |
| ROIC kumulatívne | ~131% | 2.35× | 83% | 2.5× |
| Win/settle rate | 93-97% | >90% | 77% settlements | n/a |

## Repo štruktúra
ingest/
insolvency_stats.py      # Insolvency Service monthly CSV
gazette_notices.py       # Gazette Atom feed + seed CSV
gazette_backfill.py      # Historický backfill 2020-2026
ch_insolvency_enrichment.py  # CH API: IP meno, vek firmy, PSČ
boe_bank_rate.py         # BoE IADB séria IUDBEDR
fca_short_positions.py   # FCA daily short positions XLSX
ons_business_demography.py   # ONS ročné + kvartálne dáta
model/
pipeline.py              # Tuneable pipeline model (v0.2)
app.py                     # Streamlit dashboard (5 stránok)
data/
tracker.db               # SQLite (nie v gite — CI builduje)
gazette_backfill.csv     # Git seed 137 859 záznamov 2020-2026
ch_insolvency_enrichment.csv  # 45 000 firiem, IP + vek + PSČ

## FY26 výsledky — live test 18.6.2026
- Guidance: realised revenue ~£28m, gross cash £26.6m, net debt £11.5m
- Forward book: £67m (+37% YoY), veľké prípady £32m
- Riziko: provisions do £2m na 2 oneskorených dlžníkov (£4.7m expozícia)

## Coding conventions
- DataFrames only, idempotent skripty
- INSERT OR REPLACE / INSERT OR IGNORE
- Secrets v `.env` (nikdy v kóde ani v chate!)
- Python 3.12 + uv
- Checkpoint každých 500 riadkov pri dlhých API behoch
- Sleep 0.3s pri CH API, rešpektovať X-Ratelimit-Remain
