import { useFetch } from "../../hooks/useData";
import type { Backtest } from "../../types/data";
import { BACKTEST_NOTE_SK } from "../../lib/captions";
import "../../pages/PipelineModel.css";

/* Honest backtest — model (chain on the REAL lagged insolvency series) vs the
 * canonical realised series. Color by |error%|. Covid-distorted years are
 * reported truthfully. All from backtest.json (model/pipeline.py).
 *
 * backtest.json's `note` is English; the JSON is the model's single source and
 * must not be edited, so we render a Slovak presentation translation instead. */

function errClass(absErr: number): string {
  if (absErr < 15) return "up";
  if (absErr <= 40) return "warn";
  return "down";
}

export default function BacktestTable() {
  const { data, loading, error } = useFetch<Backtest>("backtest.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 240 }} />;
  if (error || !data)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const mapeOk = data.mape_pct < data.target_mape_pct;

  return (
    <div>
      <table className="backtest-table mono">
        <thead>
          <tr>
            <th>FY</th>
            <th className="num">MODEL</th>
            <th className="num">REALITA</th>
            <th className="num">CHYBA</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.fy}>
              <td>{r.fy}</td>
              <td className="num">£{r.model_m.toFixed(1)}m</td>
              <td className="num">£{r.actual_m.toFixed(1)}m</td>
              <td className={`num ${errClass(Math.abs(r.error_pct))}`}>
                {r.error_pct > 0 ? "+" : ""}
                {r.error_pct.toFixed(1)}%
              </td>
            </tr>
          ))}
          <tr className="mape-row">
            <td colSpan={4}>
              MAPE <b className={mapeOk ? "up" : "down"}>{data.mape_pct}%</b> · cieľ
              &lt;{data.target_mape_pct}% {mapeOk ? "✓" : "✗"}
            </td>
          </tr>
        </tbody>
      </table>
      <div className="backtest-note mono">{BACKTEST_NOTE_SK}</div>
    </div>
  );
}
