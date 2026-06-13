import { useFetch } from "../../hooks/useData";
import type { ChainConstants } from "../../types/data";
import "../../pages/PipelineModel.css";

/* Model assumptions table — reads chain_constants.json (the SAME single source
 * the slider what-if uses). Each parameter with its value and source. Previews
 * path B (the model rework). No frontend-computed model number here. */

interface Row {
  param: string;
  value: string;
  source: string;
}

export default function AssumptionsTable() {
  const { data, loading, error } = useFetch<ChainConstants>("chain_constants.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 240 }} />;
  if (error || !data)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const rows: Row[] = [
    {
      param: "REFERRAL RATE",
      value: `${(data.referral_rate * 100).toFixed(2)}%`,
      source: "CH enrichment: boutique pool (82.4% trhu), nie celkový trh",
    },
    {
      param: "ACCEPTANCE RATE",
      value: `${(data.acceptance_rate * 100).toFixed(0)}%`,
      source: "MANO historické",
    },
    {
      param: "ARRCC (bear / base / bull)",
      value: `£${(data.arrcc.bear / 1000).toFixed(0)}k / £${(data.arrcc.base / 1000).toFixed(0)}k / £${(data.arrcc.bull / 1000).toFixed(0)}k`,
      source: "FY25 audited ex-BBL baseline · mix shift k väčším prípadom",
    },
    {
      param: "COMPULSORY WEIGHT",
      value: `${data.compulsory_weight.toFixed(2)}×`,
      source: "CH enrichment: OR/large podiel 17.6%, znížené z 1.30",
    },
    {
      param: "CAPACITY CAP",
      value: `${data.capacity_cap} / rok`,
      source: "FY25/FY26 skutočné completions — empirický strop",
    },
    {
      param: "LAG (total)",
      value: `${data.lag_months} mesiacov`,
      source: "13m case + 12m cash · validované LCM peer 25–27m",
    },
    {
      param: "INSOLVENCIE 12M (vstup)",
      value: data.insolvencies_12m.toLocaleString("en-GB"),
      source: "Insolvency Service · trailing 12m CVL+compulsory",
    },
  ];

  return (
    <table className="backtest-table mono assumptions-table">
      <thead>
        <tr>
          <th>PARAMETER</th>
          <th className="num">HODNOTA</th>
          <th>ZDROJ / ZDÔVODNENIE</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.param}>
            <td>{r.param}</td>
            <td className="num gold">{r.value}</td>
            <td className="assumptions-src">{r.source}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
