import { useEffect } from "react";
import "./TruthDrawer.css";

/* "Celá pravda" drawer (manual §26) — 480px from the right, overlay, Esc
 * closes. The honest capstone: the model is a leading framework not a forecast,
 * coverage is thin, data has gaps, and the valuation-bridge inputs are
 * assumptions. The legal text is never shortened or parodied. */

export default function TruthDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="truth-overlay" onMouseDown={onClose}>
      <aside
        className="truth-drawer"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Celá pravda — disclaimer"
      >
        <header className="truth-head">
          <h2 className="truth-title">CELÁ PRAVDA</h2>
          <button className="truth-close mono" onClick={onClose} aria-label="Zavrieť">
            ✕
          </button>
        </header>

        <div className="truth-body">
          <p>
            Toto je vzdelávací a komentárový nástroj, ktorý sleduje investičnú
            tézu o <b className="gold">Manolete Partners PLC</b> (LON:MANO.L).{" "}
            <b>Nikto nič negarantuje.</b> Nie je to investičné odporúčanie ani
            finančné poradenstvo.
          </p>

          <h3 className="truth-h3">Model nie je predpoveď</h3>
          <p>
            pipeline.py je <b>hrubý predstihový rámec</b>, nie presná predpoveď.
            Honest backtest dáva <b className="gold">MAPE 24.4%</b> (cieľ &lt;30%)
            — a v Covid-skreslených rokoch (FY22/FY23) sa mýli o 44–48%, lebo
            potlačené insolvencie 2020 lagované o 25 mesiacov deformujú výstup.
            Capacity cap (291) a ARRCC sú dominantné páky (viď tornado).
          </p>

          <h3 className="truth-h3">Trh tézu zatiaľ necení</h3>
          <p>
            Lead-lag korelácia insolvencií a ceny je{" "}
            <b className="down">naprieč všetkými lagmi záporná</b> (≈ −0.81 pri
            25m). Rastúce insolvencie zatiaľ sprevádza klesajúca cena — to je
            konzistentné s tézou o podcenení, ale znamená to aj, že trh môže mať
            pravdu a my nie. Dôkaz o revenue-lagu má malé n (5 fiškálnych rokov).
          </p>

          <h3 className="truth-h3">Coverage a oceňovanie</h3>
          <p>
            Cieľ <b className="gold">130p</b> je od <b>jediného</b> brokera
            (Singer) — single-analyst, nízka konsenzus váha. Oceňovací most
            (revenue → cena) stojí na <b>predpokladoch</b>, nie faktoch: PBT
            marža 10/20/30%, P/E 13×, daň 25%. Pri 20% marži base scenár
            implikuje ~142p, pri 10% ~71p — upside závisí od normalizácie marže
            (FY26 ~6.8% deprimovaná debtor delays).
          </p>

          <h3 className="truth-h3">Čo v dátach chýba</h3>
          <p>
            Neexistuje prepojenie MANO-prípadov na konkrétne IP firmy — „trhová
            štruktúra IP firiem" je preto <b>bez hrán</b>, nie referral sieť.
            Vintage triangle (kohorta × development mesiac) je v backlogu —
            vyžaduje PDF extrakciu z výročných správ. gazette company_number je
            bugnutý (drží voľný text), preto sa nepoužíva. Regionálne dáta sú z
            poštových smerovacích čísel IP (~96% pokrytie), nie z geokódovaných
            sídiel firiem.
          </p>

          <h3 className="truth-h3">Čerstvosť dát</h3>
          <p>
            Pozri stránku <b>Dáta &amp; diagnostika</b> pre presné dátumy a počty
            riadkov každého zdroja. Insolvency Service je mesačný s prirodzeným
            oneskorením; ceny sú denné z yfinance; MANO RNS sú nepravidelné.
          </p>

          <pre className="truth-ascii mono">{`
      ___
     /   \\    "zlaté teľa
    | x x |     musí zomrieť"
     \\_-_/
      | |
     _| |_
`}</pre>

          <p className="truth-legal mono">
            NIKTO NIČ NEGARANTUJE. NIE JE INVESTIČNÉ ODPORÚČANIE ANI FINANČNÉ
            PORADENSTVO. KOMENTOVANIE A VZDELÁVANIE. · MANO TRACKER · JÚN 2026
          </p>
        </div>
      </aside>
    </div>
  );
}
