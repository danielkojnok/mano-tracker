import "./ThesisScorecard.css";

/* Verdikt tézy — editorial synthesis of valuation.json + balance_sheet.json
 * + MANO FY26 update. Each figure traces to a sourced JSON value (footer). */

const SUPPORTS = [
  "Forward book £67m, ▲37% YoY — najväčší pipeline doteraz",
  "Nové signings £32m, ▲23% — BD expanzia funguje",
  "Veľké prípady £32m (48% knihy) — vyššia ARRCC mix",
  "Cena 39p vs Singer 130p — +231% k cieľu",
  "P/B 0.4× vs case NAV £42m — trh diskontuje fair value >60%",
];

const THREATS = [
  "Debtor delays £4.7m — provízia £1.5–2.0m proti FY26 PBT",
  "Net debt/EBITDA 3.7× — covenant watch, RCF headroom £6m",
  "ARRCC štrukturálne nižšie £96k vs £204k (FY19) — mix shift",
  "FY26 realised £28m < model base £33.8m — model nadhodnotil",
];

export default function ThesisScorecard() {
  return (
    <div className="scorecard">
      <div className="scorecard-cols">
        <div className="scorecard-col">
          <h3 className="scorecard-head up">PODPORUJE</h3>
          <ul className="scorecard-list">
            {SUPPORTS.map((item) => (
              <li key={item}>
                <span className="scorecard-marker up" aria-hidden="true">◆</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="scorecard-col scorecard-col-right">
          <h3 className="scorecard-head down">OHROZUJE</h3>
          <ul className="scorecard-list">
            {THREATS.map((item) => (
              <li key={item}>
                <span className="scorecard-marker down" aria-hidden="true">▼</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="scorecard-conclusion mono">
        ZÁVER: téza na pipeline drží · oceňovacia medzera široká · riziko =
        exekúcia + súvaha
      </div>
    </div>
  );
}
