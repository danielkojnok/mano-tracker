# MANO Tracker — Backlog

Položky, ktoré sú odložené z hlavnej línie prác (R1–R5 prekopanie
frontendu). Každá obsahuje: prečo sa nerobí teraz, presný scope,
závislosti, kritérium hotovo. Zoradené podľa **ekonomickej váhy pre tézu**,
nie chronologicky.

Posledná aktualizácia: 2026-06-13

---

## 1 · Prepracovanie finančného modelu (NAJVYŠŠIA PRIORITA — po frontende)

**Status:** Odložené po dokončení frontend prekopávania (R1–R5).

**Kontext:** Daniel je ekonóm, súčasný `model/pipeline.py` v0.2.1 obsahuje
asymetrický lag +9/−4m, COMPULSORY_WEIGHT 1.25, ARRCC scenáre 95/110/150k.
Tieto hodnoty boli kalibrované empiricky, nie ekonomicky odvodené. Backtest
ukazuje MAPE 23% (cieľ <30%), ale FY26 base £33.8m vs realita £28.0m =
predikcia o 21% vysoká → systematické nadhodnotenie.

**Pracovný postup (dohodnutý):**
  1. Claude doručí **kritickú ekonomickú revíziu** súčasného modelu —
     ktoré predpoklady sú slabé, nekonzistentné, alebo nemajú teoretické
     ukotvenie. Bez ohľadov, priamo.
  2. Daniel doplní **svoje ekonomické predstavy a názory** — čo by mal
     model robiť inak, akú logiku odráža realitu litigation fundingu
     lepšie.
  3. **Syntéza** — spoločná verzia modelu, kde Daniel určuje "čo"
     (ekonomická logika, predpoklady), Claude prekladá do kódu "ako"
     (`pipeline.py` v0.3).

**Vstupy do revízie (čítať pred 1. krokom):**
  - `model/pipeline.py` (aktuálna v0.2.1)
  - `research_02_kpi_benchmarks.md` — ARRCC range, mix shift
  - `research_05_stock_drivers.md` — CVL lead time 6–12m, DCF 12–15%
  - `research_06_analyst_playbook.md` — frequency × severity dekompozícia,
    veľké prípady ako diskrétny modul, debtor delay parameter
  - FY26 backtest: model £33.8m vs realita £28.0m

**Otvorené ekonomické otázky (na revíziu):**
  - Asymetrický lag +9/−4m — empiricky kalibrované, ale prečo asymetria
    PRÁVE v tomto smere? Ekonomická intuícia: pomalšie cash collection vo
    veľkých prípadoch? Treba doložiť.
  - COMPULSORY_WEIGHT 1.25 — váha bola zvolená tak, aby base scenár dával
    £33.8m. Cirkulárna kalibrácia. Treba odvodiť zdola (z reálneho mixu
    case types, nie z cieľového revenue).
  - ARRCC ako single point per scenár — research_06 odporúča mixture
    distribúciu (malé prípady log-normal + veľké prípady diskrétne).
    Zmysluplne?
  - Capacity cap (350 prípadov ročne) je fixný, ale balance sheet headroom
    (£6m RCF) ho v praxi limituje skôr.

**Hotovo keď:**
  - `pipeline.py` v0.3 s ekonomicky odvodenými predpokladmi (každý
    parameter má komentár "WHY")
  - Backtest MAPE ≤ 20%
  - FY26 hindcast v ±10% od £28.0m
  - Dokument `model/PIPELINE_RATIONALE.md` vysvetľujúci každý parameter

---

## 2 · Vintage triangle (manuál §25 — "najsilnejší prvok v3.0")

**Status:** Odložené — chýbajú vstupné dáta.

**Prečo to nie je v R1–R5:** Vintage triangle vyžaduje MANO vintage
tabuľky (rok investície × development mesiac × % inkasovaného). Tie
existujú vo výročných správach FY19–FY25 (RNS PDFy), ale ešte nie sú
vyparsované do `tracker.db`. Bez týchto dát by sme komponent postavili na
fake číslach — proti princípu "VŽDY ZDROJ" (§01).

**Scope práce:**
  1. Stiahnuť MANO výročné správy FY19–FY25 z investors.manolete-partners.com
     /results-reports/results-centre
  2. Vytvoriť `ingest/parse_mano_vintage.py` — PDF text extraction +
     parse vintage tabuľky (pravdepodobne v sekcii "Case completion
     analysis" alebo podobne)
  3. Schéma tabuľky `mano_vintage`:
