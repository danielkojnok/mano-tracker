import "./Ticker.css";

/* Hardcoded — F2 replaces with live feed.
 * The ONLY allowed infinite loop in the app (manual §19). */
const ITEMS = [
  "MANO.L 39.3 ▲0.8%",
  "INSOLV 12M 25,704 ▼2.3%",
  "SHORT 0.31%",
  "POSLEDNÝ SIGNÁL ATLANTIS COMMODITIES LIKVIDÁCIA",
  "FY27 BASE £32.4m",
];

export default function Ticker() {
  const line = ITEMS.join(" · ");
  return (
    <div className="ticker mono" aria-hidden="true">
      <div className="ticker-track">
        <span>{line} · </span>
        <span>{line} · </span>
      </div>
    </div>
  );
}
