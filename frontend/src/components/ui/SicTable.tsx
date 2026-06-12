import "./SicTable.css";

/* Static for now — F4 pulls live SIC aggregates from DB via JSON. */
const ROWS = [
  { sic: "41", name: "Výstavba", n12m: 4118, yoy: -10 },
  { sic: "56", name: "Pohostinstvo", n12m: 3346, yoy: -3 },
  { sic: "47", name: "Maloobchod", n12m: 2034, yoy: 4 },
  { sic: "43", name: "Šp. stavebníctvo", n12m: 2257, yoy: -10 },
  { sic: "68", name: "Reality", n12m: 960, yoy: 22 },
  { sic: "49", name: "Doprava", n12m: 1847, yoy: -1 },
];

const MAX = Math.max(...ROWS.map((r) => r.n12m));

export default function SicTable() {
  return (
    <table className="sic-table mono">
      <thead>
        <tr>
          <th>SEKTOR</th>
          <th className="num">12M</th>
          <th className="num">YOY</th>
        </tr>
      </thead>
      <tbody>
        {ROWS.map((r) => (
          <tr key={r.sic}>
            <td>
              SIC {r.sic} {r.name}
            </td>
            <td className="num">
              {/* In-cell bar (manual §25/10): gold-dim @30%, number outside right */}
              <span className="cell-bar-wrap">
                <span
                  className="cell-bar"
                  style={{ width: `${(r.n12m / MAX) * 100}%` }}
                />
              </span>
              {r.n12m.toLocaleString("en-GB")}
            </td>
            <td className={`num ${r.yoy >= 0 ? "up" : "down"}`}>
              {r.yoy >= 0 ? "▲" : "▼"}{Math.abs(r.yoy)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
