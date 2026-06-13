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
     vintage_fy        TEXT,     -- rok investície, napr. "FY21"
     development_month INTEGER,  -- mesiacov od investície (6,12,18,24,30)
     cases_count       INTEGER,  -- počet prípadov v kohorte
     pct_collected     REAL,     -- % nominálnej hodnoty inkasované
     cumulative_roi    REAL,     -- kumulatívne ROI kohorty k bodu
     money_multiple    REAL      -- realizovaný multiple (cash out / in)
  4. Export do `frontend/public/data/vintage.json`
  5. Vintage triangle komponent per DESIGN-MANUAL.md §25 — heatmap
     kohorta-rok × dev-mesiac, prázdne (budúce) bunky čiarkovaný rám,
     škála --bg-2 → --gold podľa pct_collected

**Hotovo keď:**
  - vintage triangle ukazuje reálne FY19–FY25 kohorty z annual reports
  - % inkasovaného v 24m okne pre FY21–22 ≈ reportovaný realised ROI
  - footer: "Zdroj: MANO výročné správy FY19–FY25"

---

## 3 · Network graf IP ↔ MANO (market-structure verzia)

**Status:** Pivot — nemáme MANO case-level väzbu (judgments = 10 riadkov,
mŕtvy feed). Namiesto fake hrán postavíme market-structure verziu.

**Čo staviame (R4):** Network/treemap 1 175 IP firiem z `ip_network.json`,
veľkosť uzla = počet prípadov, farba = región.

**Pôvodná MANO-referral verzia neskôr:**
  1. Overiť či `caselaw_feed.py` Atom feed vracia >10 výsledkov
  2. Ak mŕtvy → scrape MANO "Settlement Update" RNS → extract IP mená →
     match na ip_network
  3. Pri >50 reálnych väzbách postaviť ego-network per §13

**Hotovo keď:** judgments >100 ALEBO RNS extrakcia >50 prípadov; network
ukazuje MANO ako zlatý uzol s reálnymi hranami.

---

## 4 · UK hex-bin mapa (manuál §12)

**Status:** Odložené — v R4 nahradené regionálnym treemap/bar z PSČ.

**Prečo nie teraz:** Plná hex mapa = 2–3 dni + geoJSON UK (5–10 MB).
Lepší pomer hodnota/čas má regionálny bar z `ip_network.primary_region`.

**Plán neskôr:** ONS postcode boundaries → H3 agregácia (h3-py) →
`uk_hex.json` → ECharts geo alebo deck.gl → 3 zoom úrovne + playback.

**Hotovo keď:** mapa renderuje UK heatmap, 3 zoom úrovne, mesačný
playback, <2s render.

---

## 5 · Case karty a case timeline (manuál §17)

**Status:** Odložené — chýbajú MANO case dáta. Závislé na bode 3.

**Scope:** tabuľka `mano_cases` (company, IP, purchase_price, recovery,
multiple, duration) → case karta + 480px drawer + timeline + beeswarm
trvania (§25/11).

**Hotovo keď:** mano_cases >100 záznamov; karta ukazuje reálny prípad.

---

## 6 · Ďalšie nápady z manuálu / researchov

V scope R1–R5: §25/3 tornado (R2) · §25/5 diff (R5) · §25/6 sezónna
matica (R4) · §25/8 drawdown (R3) · §25/9 korelačná matica (R5) · §19
command palette (R5) · §26 disclaimer drawer (R5).

Nezachytené z researchov:
  - Covenant warning badge (Net Debt/EBITDA >4.0×) — R3, zlatá bodka
  - Sentiment vrstva — >£250k settlements RNS za 12m (driver #1 ceny) —
    vyžaduje RNS extrakciu (bod 3)
  - Truck cartel separátny line item (~£15m) — vyžaduje pipeline.py v0.3

---

## Kontext pre budúce chaty

Pri presune sprístupniť: `DESIGN-MANUAL.md`, `BACKLOG.md`. research_01–06
a MANO Tracker PDF sú v project files. Claude memory drží pracovný režim,
jazykové konvencie, preferenciu kritickej revízie modelu pred syntézou.
