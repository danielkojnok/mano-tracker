# MANO TRACKER — DIZAJN MANUÁL v3.0 · JÚN 2026

Vizuálny systém pre tracker investičnej tézy Manolete Partners (LON:MANO.L).
Tmavý terminál s DNA Zlatého teľaťa — čierna, zlatá, krv.
Hustota Bloombergu, čitateľnosť modernej webovej aplikácie.

---

## 00 ZÁKONY ČITATEĽNOSTI — NAJVYŠŠIA PRIORITA · KOLÍZIA = BUG

Záväzné pre každý komponent. Pri konflikte s ktorýmkoľvek iným pravidlom
manuálu vyhrávajú zákony 00.

**ZÁKON 1 — ŠTÍTKY V GRAFOCH**
Pri kolízii sa slabší štítok (nižšia hodnota) skryje alebo presunie s 1px
vodiacou linkou --gold-dim. Max 8 priamych štítkov na graf — zvyšok len
v tooltipe.

**ZÁKON 2 — LEGENDA**
Legenda nikdy neprekrýva dátovú plochu. Default pod grafom; pri <3 sériách
štítky priamo na konci čiar (Bloomberg štýl) a legenda sa ruší.

**ZÁKON 3 — MINIMÁLNE MEDZERY**
Medzi panelmi 16px vždy. Text od rámu panelu min. 16px. Dva mono štítky od
seba min. 8px — inak platí zákon 1.

**ZÁKON 4 — DLHÉ NÁZVY**
Firmy a IP mená: ellipsis na 28 znakov + plný názov v tooltipe. Stĺpec
s názvom min-width 180px, nikdy nezalamuje do 3+ riadkov.

**ZÁKON 5 — MAXIMÁLNA HUSTOTA**
Graf max 6 simultánnych sérií (potom prepínač skupín). Tabuľka max 9 stĺpcov
na desktope. KPI rad max 4 karty.

**ZÁKON 6 — Z-INDEX HIERARCHIA (FIXNÁ)**
Nič iné nesmie byť absolute nad dátami.
  1 · TOOLTIP    z-50
  2 · DRAWER     z-40
  3 · TOAST      z-30
  4 · STICKY HEADER z-20
  5 · TICKER     z-10
  6 · OBSAH      z-0

**ZÁKON 7 — OSI BEZ ŠIKMÉHO TEXTU**
Pri zahustení popisky osi X preskakujú (každý 2./3.), ostávajú na 0°.
Nikdy šikmý text.

**ZÁKON 8 — RESPONZÍVNY PRETEK**
Panel užší ako 480px = graf prepne na zjednodušený režim: menej gridov,
väčšie fonty, žiadne priame štítky.

---

## 01 PRINCÍPY

- DÁTA SÚ HRDINA: Čísla najväčšie, chróm najmenší. Každý pixel, ktorý nie
  je dáta, musí mať dôvod.
- ZLATÁ JE VZÁCNA: Zlatá označuje značku, aktívny stav a kľúčovú metriku.
  Nikdy nie plošná výplň veľkých plôch.
- TERMINÁL, NIE WEB: Ostré rohy, 1px linky, žiadne tiene. Hĺbku tvoria
  odtiene pozadia, nie blur a glow.
- VŽDY ZDROJ: Každý graf a tabuľka má riadok „Zdroj:" — téza stojí na
  overiteľných dátach.
- NIČ SA NEPREKRÝVA: Kolízia dvoch prvkov = bug, nie kozmetika.

---

## 02 LOGO & ZNAČKA

- Ochranná zóna = výška kríža okolo celého znaku
- V hlavičke aplikácie min. 32px, ideálne 40px
- Nefarbiť, nenakláňať, nepridávať tieň ani glow
- Wordmark „MANO TRACKER" sadzbou Michroma, nikdy nesimulovať font z banneru
- Lockup hlavičky: logo + "MANO TRACKER" (Michroma) + "LITIGATION FUNDING
  · LON:MANO.L" (mono 11px)
- PRIMÁRNE: čierne pozadie — header, favicon, loading
- INVERZNÉ: biele pozadie — print, export, email
- Logo súbory: assets/logo-dark.png (primárne), assets/logo-light.png (print)

---

## 03 FARBY

POVRCHY — TEPLÁ ČIERNA, TRI KROKY HĹBKY:
  --bg-0: #0B0B09   plocha stránky
  --bg-1: #14140F   panel, karta
  --bg-2: #1C1C14   hover, vnorený blok
  --border: #2A2A1F         1px linky
  --border-strong: #45452F  fokus, oddelenie sekcií
  --row-line: #1E1E16       oddelenie riadkov tabuliek

ZNAČKA — ZLATÉ TEĽA (TEXT NA ZLATEJ = VŽDY ČIERNY):
  --gold: #F5C400         značka, aktívny stav, primárna akcia, séria MANO
  --gold-bright: #FFD93B  hover zlatej
  --gold-tint: rgba(245,196,0,0.08)  podsvietenie aktívnych prvkov
  --gold-dim: #8A7A2B     sekundárne zlaté detaily

TEXT & SÉMANTIKA:
  --text: #EDEBDF         primárny text
  --text-2: #A8A493       sekundárny text, popisky
  --up: #3DC97B           rast ▲
  --down: #E5484D         pokles ▼, krv
  --signal: #4CB8E8       predstihový indikátor (insolv +24m) — CYAN
  --warn: #F08C00         upozornenie

PRAVIDLO: Zelená a červená sú rezervované VÝHRADNE pre smer zmeny (▲/▼)
a stav kvality dát. Cyan patrí len predstihovému indikátoru.

---

## 04 TYPOGRAFIA

MICHROMA — DISPLAY:
  Použitie: IBA nadpisy sekcií a brand
  Vždy VERZÁLKY, letter-spacing 0.02–0.06em
  Nikdy pod 18px, nikdy na dlhý text
  Font weight: 400

ARCHIVO — UI:
  Použitie: text, popisy, názvy panelov
  Telo 14–15px / 400, dôraz 600
  Font weights: 400, 600, 700

JETBRAINS MONO — DÁTA:
  Použitie: VŠETKY číselné hodnoty, tickery, osi grafov, SIC kódy,
  časové pečiatky, labely
  Vždy font-variant-numeric: tabular-nums
  Font weights: 400, 600, 700

VEĽKOSTNÁ ŠKÁLA:
  display / 28px      INSOLVENČNÝ TRH          titulok stránky
  kpi / 32px mono 600 £32.4m                   hodnota KPI karty
  panel title / 13px 600  Lievik konverzie      hlavička panelu
  body / 14px         Cyan línia = ...          popisy, vysvetlivky
  micro / 11px mono   MESAČNÉ INSOLVENCIE       labely, osi, zdroje

---

## 05 GEOMETRIA & POVRCHY

ANATÓMIA PANELU — tri zóny, dve 1px linky:
  [header: zlatý štvorček 8px ■ + názov panelu + voliteľný pravý slot]
  [1px --border linka]
  [body: obsah — graf / tabuľka]
  [1px --border linka]
  [footer: "Zdroj: ..." mono 11px --text-2]

POLOMERY & LINKY:
  Panely, karty, tabuľky: border-radius 0
  Tlačidlá, inputy, tagy: border-radius 2px
  Všetky čiary a rámy: 1px solid
  Tiene: ZAKÁZANÉ

MRIEŽKA 8PX:
  Vnútro panelu: 16px padding
  Medzera medzi panelmi: 16px gap
  Medzera medzi sekciami: 32–48px
  Layout: 12-stĺpcový grid, max-width 1440px

---

## 06 KOMPONENTY

KPI KARTA — 4 STAVY:
  Ukážkové hodnoty (použiť ako hardcoded placeholder v F1):
    - label: "MESAČNÉ INSOLVENCIE", value: "2,138", sub: "▲ 2.8% medziročne",
      trend: up
    - label: "IMPLIK. TRŽBY FY27", value: "£32.4m", sub: "model · základný
      scenár", isKeyMetric: true (2px zlatý top-border, zlatá hodnota)
    - label: "ZDRAVIE PIPELINE", value: "Klesá", sub: "▼ 2.3% vážený trh 12m",
      trend: down (slovný stav preberá sémantickú farbu --down)
    - label: "CENA AKCIE MANO.L", value: "39.3 GBX", sub: "▲ 0.8% deň",
      trend: up

  Pravidlá:
    Hodnota vždy mono 28–32px / 600
    Kľúčová metrika (jedna na stránku): 2px zlatý top-border + zlatá hodnota
    Slovné stavy ("Klesá") preberajú sémantickú farbu
    Zákon 5: max 4 karty v rade

DÁTOVÁ TABUĽKA:
  Čísla vpravo, mono, tabular-nums
  Zebra NIE — oddelenie jemnou linkou --row-line #1E1E16
  Hover = --bg-2 background
  Riadok 36–40px výška

TAGY:
  border-radius 2px, 1px border, mono 11px, uppercase
  Farby podľa kontextu (zlatá = aktívny scenár, cyan = signal, atď.)
  Príklady: ZÁKLADNÝ SCENÁR · PESIMISTICKÝ · OPTIMISTICKÝ ·
            LIKVIDÁCIA · ROZSUDOK · DÁTA OK ✓

TLAČIDLÁ:
  Primárne: gold background, čierny text, border-radius 2px
  Sekundárne: transparent background, --border border
  Tiché: žiadny border, --text-2 farba
  Hover na primárnom: --gold-bright

SCENÁROVÉ SLIDERY:
  Label + hodnota (mono zlatá) na pravej strane labelu
  Dráha 4px výška, palec 14px štvorec s 2px zlatým rámom
  Zmena prepočítava model naživo — zmenené hodnoty bliknú
  --gold-tint pozadím na 600ms

---

## 07 DÁTOVÉ VIZUALIZÁCIE

SÉMANTIKA SÉRIÍ (FIXNÁ — nikdy nemeniť):
  Zlatá --gold:           MANO skutočnosť, MANO séria
  Cyan --signal:          predstihový indikátor (insolv +24m)
  Zelená čiarkovaná --up: projekcia / forward estimate
  Červená --down:         negatívny scenár / drawdown

PRAVIDLÁ GRAFOV:
  Pozadie grafu = pozadie panelu (žiadny vlastný podklad)
  Mriežka: #1E1E16, bodkovaná, len horizontálna
  Osi a popisky: JetBrains Mono 10–11px, --text-2 (#A8A493)
  Bez rámu okolo plochy grafu — len os X a Y
  Pásma neistoty: výplň farby série @ 10% opacity, bez obrysu
  Heatmapa: od --bg-2 cez --gold po --down (čierna→zlatá→krv)
  Tooltip: --bg-2 pozadie, 1px --border-strong, mono čísla;
           krížový kurzor 1px --gold-dim
  Udalosti (RNS): zvislá 1px čiarkovaná --gold-dim s mono štítkom hore
  Decimácia: nad 500 bodov LTTB downsampling
  Prázdne obdobia: gap v čiare, nikdy interpolácia bez označenia

---

## 08 HLAS & MIKROTEXT

TAKTO ✓:
  Slovenčina v UI, anglické odborné termíny nechať
  (referral rate, forward book, winding-up petition)
  Vecné, skeptické: „Model je hrubý predstihový rámec, nie presná predpoveď."
  Labely VERZÁLKAMI v mono: MESAČNÉ INSOLVENCIE
  Každé tvrdenie s číslom má zdroj a dátum
  Titulok stránky ako otázka tézy: „Podporuje pipeline tézu o oživení tržieb?"

TAKTO NIE ✗:
  Emoji ikony v navigácii (🎯 📊) — nahradiť ◆ ◇ alebo line ikonami
  Marketingové superlatívy
  Gradientové pozadia, glow, zaoblené karty s tieňom
  Zlatá ako farba veľkých textových blokov
  Čísla v proporcionálnom písme — vždy mono + tabular-nums

---

## 09 UKÁŽKA — KOMPLETNÁ STRÁNKA

HEADER (sticky z-20):
  [logo 40px] MANO TRACKER / UK INSOLVENČNÝ PREDSTIH ~24 MES.
  [pravá strana] MANO.L 39.3 ▲0.8%  INSOLV 12M 25.7k ▼2.3%  [live dot]

SIDEBAR:
  ◆ Prehľad          (active — zlatý ľavý border)
  ◇ Insolvenčný trh
  ◇ Pipeline model
  ◇ Spoločnosť
  ◇ Dáta & diagnostika

TICKER (z-10, bottom):
  MANO.L 39.3 ▲0.8% · INSOLV 12M 25,704 ▼2.3% · SHORT 0.31% ·
  POSLEDNÝ SIGNÁL ATLANTIS COMMODITIES LIKVIDÁCIA · FY27 BASE £32.4m

---

## 10 IMPLEMENTÁCIA

CSS TOKENY: viď sekcia 03 — kopírovať 1:1 do tokens.css.

POZNÁMKY PRE CLAUDE CODE:
  - Kompletný spec je v DESIGN-MANUAL.md — referovať z CLAUDE.md
  - Fonty: Google Fonts (preconnect v index.html)
  - ECharts/Recharts: globálna šablóna podľa sekcie 07
    (transparent bg, mriežka #1E1E16, fixné farby sérií)
  - Logo: assets/logo-dark.png a assets/logo-light.png
  - Prechody: len color/background/border, 120ms ease-out
  - Focus: 1px outline --gold, offset 2px

---

## 11 ILUSTRAČNÁ VRSTVA „ZLATÉ TEĽA"

Štýl: bold cartoon-brutalist, hrubý čierny outline 2–3px, ploché farby.
Paleta VÝHRADNE: zlatá #F5C400, krv #E5484D, kosť #EDEBDF, čierna #0B0B09.

SADA ILUSTRÁCIÍ (13 kusov):
  REFERENCIA ŠTÝLU   — logo
  NÁHROBOK £         — mŕtva firma / CVL
  LIKVIDÁTOR         — aktovka + kosa
  KLADIVKO × TEĽA    — rozsudok
  ZVITOK + PEČAŤ     — winding-up petition
  BEAR/BULL TEĽA     — scenáre
  VRECE £ + KRÍŽ     — recovery / inkaso
  HODINY S KOSŤAMI   — lag / čakanie (25M)
  LIEVIK Z KOSTÍ     — pipeline funnel
  LUPA S OKOM        — signály / intel
  SHORT-MEDVEĎ       — trhajúci sa £ padák
  ORÁKULUM           — projekcie / disclaimer
  SERVER-KRYPTA      — diagnostika / data health

POUŽITIE ✓:
  Max 1 spot ilustrácia na obrazovku/sekciu
  Max 80×80px v UI, 120×120px v prázdnych stavoch
  Len: hlavičky sekcií, empty states, loading, 404, export covers

ZAKÁZANÉ ✗:
  Vnútri grafu alebo tabuľky — nikdy
  Gradienty, glow, tiene, 3D render
  Farby mimo palety
  Animované GIFy a nekonečné slučky

INTERAKCIA „PSEUDO-3D":
  TILT-ON-HOVER: CSS perspective transform, max 10°, 120ms ease-out.
    Kurzor vľavo = −10°, vpravo = +10°.
    Tieň NEVZNIKÁ — namiesto neho zosilnie 1px --gold rám.
  DRAG-TO-SPIN: Easter egg — klik+ťahanie roztočí okolo Y osi,
    rubová strana = silueta v --gold-dim. Dotočí späť s pružinou.
    Max 1 spin naraz.
  HRANICE: LEN ilustrácie v hlavičkách a empty states.
    NIKDY keď je tabuľka vo viewporte počas scrollu.
    Rešpektuje prefers-reduced-motion — vypne sa úplne.

---

## 12 GEOGRAFIA — UK MAPA INSOLVENCIÍ

TRI ÚROVNE ZOOMU:
  Úroveň 1: ITL1 — 12 regiónov (celý UK)
  Úroveň 2: Postcode Area — 124 oblastí (DEFAULT)
  Úroveň 3: Londýn inset — NW/N/E/W/EC/WC/SW/SE

PRAVIDLÁ MAPY:
  Abstraktná vektorová mapa — žiadne Google Maps / satelit
  Podklad --bg-1, hranice regiónov 1px --border
  Hex škála: --bg-2 → --gold → --down (čierna→zlatá→krv)
  Tooltip: --bg-2, 1px --border-strong, mono čísla
  Zoom tlačidlá: +/− štýl sekundárnych tlačidiel, pravý horný roh

HEX-BIN: insolvencie 12m, zdroj: Gazette notices + geokódované PSČ
BODOVÁ: IP kancelárie — veľkosť bodu = počet prípadov
MINI-MAPA V KPI KARTE: 60×80px, najhorúcejší región

HOVER KARTA OBLASTI:
  M · Manchester ▲ 6% YoY / 1,127 INSOLVENCIÍ 12M
  TOP SEKTOR: 41 VÝSTAVBA / TOP IP: BEGBIES TRAYNOR

ČASOVÝ PLAYBACK: slider mesiac-po-mesiaci, prehrá raz a zastaví.
  Žiadny autoloop.

---

## 13 NETWORK GRAF — IP FIRMY ↔ PRÍPADY

PRAVIDLÁ:
  Uzly = štvorce (border-radius 2px), nie kruhy
  Veľkosť uzla = počet prípadov
  MANO = centrálny zlatý uzol (väčší)
  Hrany: 1px --border; aktívna cesta: --gold
  Hover = ego-network (zvyšok stmavne na 30% opacity)
  Štítky: mono 10px len top 10 uzlov, ostatné na hover

DETAIL UZLA (panel vpravo):
  IP meno, región, počet prípadov, počet MANO väzieb
  Top 3 SIC sektory s % podielom (horizontal bar)

ZDROJ: Gazette appointments × MANO case records

---

## 14 COHORT FLOW / SANKEY

SANKEY — insolvencie → tržby:
  Toky: --signal (cyan), finálny tok do revenue: --gold
  Šírka toku = objem (odmocninová škála)
  Stupne: VÁŽENÝ TRH → DOPYTY → INVESTÍCIE → UKONČENIA → TRŽBY

COHORT WATERFALL:
  Kohorta (cyan) → tržby (zlatá), lag viditeľný vizuálne
  Budúce kohorty @ 55% opacity
  Statická verzia = default, print, export
  Animovaná: pohyb raz pri scrolle do view, 600ms ease-out, potom statika
  Farba bloku: cyan → zlatá počas presunu. Žiadne nekonečné slučky.

---

## 15 3D PRVKY — JEDINÉ POVOLENÉ 3D

SURFACE PLOT SCENÁROV:
  X = Referral Rate, Y = ARRCC, Z = Revenue
  Drôtený model (wireframe) 1px --gold-dim
  Vrchol základného scenára = zlatý bod
  Drag-to-rotate
  Vždy s prepínačom 2D fallback

HEX TERÉN:
  SIC sektor × mesiac × objem ako extrudované hexagóny
  Výška = objem, farba = heatmap škála
  Izometrický uhol 30°, pomalá auto-rotácia (vypnuteľná)

PEVNÉ PRAVIDLO:
  3D LEN tam, kde tretia dimenzia nesie reálnu premennú.
  Žiadne plné plochy, žiadne tiene — len drôt.
  Vždy prepínač 2D fallback v hlavičke panelu.

---

## 16 DISTRIBUČNÉ & PRAVDEPODOBNOSTNÉ GRAFY

FAN CHART — projekcia s percentilmi:
  Pásma P5/P25/P50/P75/P95
  Pásma --up @ 6/12% opacity, medián zelená čiarkovaná
  n = 10 000 simulácií (v pätičke každého pravd. grafu)

HISTOGRAM + POSTERIOR — trvanie prípadu:
  Bimodálna distribúcia (rýchle urovnania 8–14m vs. súdy 28–40m)
  Stĺpce --gold-dim, posterior --gold 2px

SURVIVAL CURVE:
  Kaplan-Meier z case records
  Schodová čiara --signal (cyan)
  % otvorených prípadov v čase

MONTE CARLO SPAGHETTI:
  100 ciest @ 8% opacity --text-2
  Medián --gold čiarkovaný, realita --gold 2px
  n = 10 000 simulácií

SPOLOČNÉ PRAVIDLÁ:
  Percentily popísané priamo v grafe (nie len v legende)
  Každý pravd. graf má v pätičke "n = X simulácií"
  Žiadna interpolácia bez označenia

---

## 17 CASE KARTY & TIMELINE

CASE KARTA:
  Header: názov firmy (tučný) + outcome tag (VYHRANÝ/UROVNANÝ/
          PREHRANÝ/OTVORENÝ) vpravo
  Sub-header: company number · SIC kód · IP firma
  Value row: kúpna cena → inkaso → multiple (mono, zlatá pre multiple)
  Mini timeline: 4 míľniky (KÚPA → ŽALOBA → ROZSUDOK → INKASO)
                 farebné bodky na dráhe
  Trvanie: mono vpravo dole

CASE DETAIL — DRAWER 480PX:
  Vysúva sa sprava, overlay rgba(11,11,9,0.7), Esc zatvára
  Chronologické udalosti s dátumami
  Link "ROZSUDOK NA FIND CASE LAW →"

CASE TIMELINE PANEL:
  Horizontálne bary per prípad
  Farba = outcome (--up / --warn / --down / --signal)
  Čiarkovaný koniec = otvorený prípad
  Medián vertikálna čiara s labelom

---

## 18 TRHOVÁ OBRAZOVKA

OHLC + VOLUME + RNS:
  Sviečky --up/--down
  Volume --text-2 @ 40% opacity
  RNS = zvislá 1px čiarkovaná --gold-dim s labelom

SHORT INTEREST:
  Horizontálny gauge 0–5%
  Prahy: 0.2% a 0.5% označené
  Prázdny stav: "ŽIADNE VEREJNÉ SHORT POZÍCIE" + mini ilustrácia

VALUATION DCF VS. CENA:
  Horizontálna linka: cena (zlatá bodka) vs. DCF scenáre (pásmo)
  Pásmo = scenáre 48–92p

PEER PANEL — LITIGATION FUNDERS:
  MANO / BURFORD / LCM / OMNI
  MANO stĺpec vždy --gold-tint pozadie
  Metriky: Market cap, P/B, Realised ROI
  Zdroj: výročné správy, jún 2026

---

## 19 KINETICKÁ VRSTVA „TERMINAL DRAMA"

BOOT SEKVENCIA (1× za session):
  > INIT MANO TRACKER v2.0
  > DB ................. OK ✓
  > FEEDS: GAZETTE / RNS / YFINANCE ... OK ✓
  > MODEL pipeline.py v0.2 ..... OK ✓
  > RENDER TERMINAL █
  Trvanie 1.5–2s, preskočiteľná klikom.

TICKER PÁSKA:
  Mono 11px, nekonečný CSS scroll, pauza on hover
  JEDINÁ povolená nekonečná slučka v celej aplikácii
  prefers-reduced-motion → vypnúť úplne

MIKROKINETIKA:
  Číselné rolovanie: KPI pri zmene roluje číslice 200ms,
    potom --gold-tint blik 600ms
  Signal pulse: nový feed záznam pulzne 1× ľavým borderom farby typu
    (nie nekonečné pulzovanie)
  Scramble efekt: Michroma titulky sa pri načítaní stránky 400ms
    náhodne pretáčajú cez glyfy a zacvaknú — raz na page load

DATA RAIN:
  Max 6% opacity, LEN boot/404/hero exportov
  NIKDY za grafmi a tabuľkami

TVRDÉ PRAVIDLO:
  Žiadny kinetický efekt nesmie trvať dlhšie ako 2s ani sa opakovať
  v slučke počas čítania dát. Jediná výnimka: ticker páska.

---

## 20 ALERTY & NOTIFIKÁCIE

TOAST (pravý horný roh, z-30):
  Max 3 súčasne, auto-dismiss 8s, manuálne ✕
  Závažnosti: info (cyan border) · pozitívne (green) ·
              varovanie (--warn) · kritické (--down, 2px rám)

ALERT FEED (stránka):
  Filter tagy: VŠETKO / PETITION / ROZSUDOK / RNS / CENA / DÁTA
  Riadok: dátum mono · popis · typ tag vpravo

TELEGRAM/EMAIL ŠABLÓNA:
  Čistý mono text s ASCII rámikom
  Typ + timestamp v prvom riadku
  Outcome s multiple, deep-link späť do trackera

---

## 21 DIAGNOSTIKA & DÁTOVÉ ZDRAVIE

FRESHNESS MATRIX:
  Stĺpce: ZDROJ / POSLEDNÝ BEH / ĎALŠÍ BEH / RIADKY / KVALITA 30D
  Kvalita = sparkline riadkových počtov + bodka --up/--warn/--down

PIPELINE DIAGRAM:
  Uzol = skript, farba rámu = stav posledného behu
  ingest_gazette → clean_sic → weight_model → pipeline.py

MAPE TRACKER:
  Cieľ <30%, aktuálne 32% (pipeline.py v0.2)
  Sparkline historického MAPE
  Model version badge v pätičke každého modelového grafu

---

## 22 EXPORT & SUBSTACK ŠABLÓNY

PDF REPORT (A4, svetlé pozadie):
  Inverzné logo + dátum + "pipeline.py v0.2"
  Print-safe farby (viď nižšie)
  Pätička: "NIKTO NIČ NEGARANTUJE..." mono 8px

SOCIAL CARD (1200×630 OG):
  Tmavé pozadie, Michroma titulok, logo

SUBSTACK BLOK:
  Graf + zdroj + watermark mono 9px --gold-dim vpravo dole
  Bez nadpisu (patrí článku)

PRINT-SAFE FARBY (PDF / TLAČ NA BIELOM):
  --gold   → #B8940A   (kontrast na bielej ≥ 3:1)
  --up     → #1E8A50
  --down   → #C03538
  --signal → #1B7FA8
  text     → #111
  mriežka  → #DDD9CC
  Pozadia biele, inverzné logo, sémantika sérií identická.

---

## 23 STAVY SYSTÉMU

LOADING: skeleton screens (animated --bg-2 pulse), text "NAČÍTAVAM…"

EMPTY STATE:
  Ilustrácia (max 80px) + popis + akčné tlačidlo
  Príklad: "ŽIADNE SIGNÁLY PRE TENTO FILTER" + "ZRUŠIŤ FILTER"

ERROR STATE:
  2px --down rám, červený label "CHYBA 502 · FEED NEDOSTUPNÝ"
  + popis + "↻ SKÚSIŤ ZNOVA" tlačidlo

NO DATA:
  Vysvetlenie dátového rozsahu + navigačné tlačidlo

404:
  Veľká ilustrácia 120px (NÁHROBOK £) + data rain pozadie
  Boot-štýl text: "> STRÁNKA NEEXISTUJE // NÁVRAT NA TERMINÁL →"

---

## 24 RESPONZÍVNE & MOBILE

BREAKPOINTY:
  1440px  plný grid (primary target)
  1024px  2-stĺpcové panely
  768px   1 stĺpec, sidebar skrytý
  390px   bottom tab bar

MOBILE PRAVIDLÁ:
  Sidebar → bottom tab bar, 5 položiek, min hit target 44px
  KPI karty: 2×2 grid
  Tabuľky: horizontálny scroll s pripnutým prvým stĺpcom
  Mapa a network graf → statické verzie +
    "OTVORIŤ NA DESKTOPE PRE INTERAKCIU"
  3D prvky → vždy 2D fallback na mobile
  Ticker ostáva
  Grafy v zjednodušenom režime (zákon 8)

---

## 25 POKROČILÉ NÁSTROJE — BLOOMBERG-CLASS ARZENÁL

1 · COMMAND PALETTE (CMD+K):
  Vyhľadávač cez celý tracker
  Výsledky: STRÁNKY / FIRMY / AKCIE / DÁTA
  Plná klávesnicová navigácia (↑↓ ↵ Esc)

2 · VINTAGE TRIANGLE ("najsilnejší nový prvok"):
  Tabuľka kohorta-rok × development-mesiac
  % inkasovaného per bunku, heatmap škála
  Prázdne bunky (budúcnosť) = čiarkovaný rám
  Presne mapuje 25m lag tézy

3 · TORNADO CHART — citlivosť FY27 revenue:
  Faktory: REFERRAL / ARRCC / ACCEPTANCE / LAG ±3M / COSTS
  Protismerné bary od stredovej osi, zoradené podľa dopadu
  Stred = £32.4m base

4 · SCENÁR A/B SPLIT + DELTA:
  Synchronizované osi oboch scenárov
  Delta stĺpec farebne ▲▼

5 · DIFF REŽIM — "čo sa zmenilo":
  Badge v hlavičke + zlatá bodka pri každom zmenenom paneli
  Bodka zmizne po otvorení panelu

6 · SEZÓNNA MATICA — YoY heatmap:
  Os X: mesiace J–D, Os Y: roky
  Marcové peaky (koniec daňového roka) viditeľné hneď

7 · TREEMAP MARKET MAP:
  Plocha = objem, farba = YoY (--up/--down tinty)
  Klik = drill-down do pod-SIC (FinViz štýl v našej palete)

8 · DRAWDOWN UNDERWATER:
  Plocha pod nulou = % pod ATH
  Krvavá výplň @ 20%

9 · KORELAČNÁ MATICA:
  Škála: --down (−1) → --bg-2 (0) → --up (+1)
  INSOLV×REV s lagom +25m = .72 (kľúčová bunka)

10 · IN-CELL BARY (league tables):
  Bar --gold-dim @ 30%, číslo VŽDY mimo baru vpravo

11 · BEESWARM — prípady:
  X = trvanie, farba = outcome
  Bimodalita viditeľná (urovnania 8–14m vs. súdy 28–40m)
  Hover = case tooltip

12 · RIDGELINE — trvanie po rokoch:
  Vrstvené hrebene, aktuálny rok --gold
  Prvý vrchol rastie = urovnania zrýchľujú

---

## 26 DISCLAIMER — „PRÁVNE TEĽA"

FOOTER STRIP (každá stránka):
  "NIKTO NIČ NEGARANTUJE." + "CELÁ PRAVDA →" link
  Orákulum ilustrácia 32px s tilt-on-hover

DRAWER „CELÁ PRAVDA" (480px sprava):
  Overlay rgba(11,11,9,0.7), Esc zatvára
  Plný právny text v Archivo 14px
  Kľúčové vety zvýraznené --gold
  ASCII artwork vola-kríž na konci

PÄTIČKA EXPORTOV/PDF (mono 8px):
  "NIKTO NIČ NEGARANTUJE. NIE JE INVESTIČNÉ ODPORÚČANIE ANI
  FINANČNÉ PORADENSTVO. KOMENTOVANIE A VZDELÁVANIE.
  · MANO TRACKER · {dátum}"

TÓN:
  Právny text sa nikdy neskracuje ani neparoduje
  Hravý je len obal (ilustrácia, ASCII)
  Drawer sa otvára len na vyžiadanie — disclaimer neblokuje obsah

---

*MANO TRACKER · DIZAJN MANUÁL v3.0 · zlaté teľa musí zomrieť · jún 2026*
