import "./Header.css";

/** Sticky header (z-20) — DESIGN-MANUAL.md §09.
 *  Logo image TODO: assets/logo-dark.png missing from repo —
 *  typographic gold-square placeholder until the asset exists. */
export default function Header() {
  return (
    <header className="app-header">
      <div className="header-brand">
        <img src="/mano-tracker/logo-dark.png" alt="MANO TRACKER logo" style={{ height: "40px", width: "auto" }} />
        <div>
          <div className="header-wordmark">MANO TRACKER</div>
          <div className="header-subtitle mono">UK INSOLVENČNÝ PREDSTIH ~24 MES.</div>
        </div>
      </div>
      <div className="header-quotes mono">
        {/* Hardcoded — F2 replaces with live data */}
        <span>
          MANO.L 39.3 <span className="up">▲0.8%</span>
        </span>
        <span>
          INSOLV 12M 25.7k <span className="down">▼2.3%</span>
        </span>
      </div>
    </header>
  );
}
