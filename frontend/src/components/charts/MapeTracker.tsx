import ReactECharts from "echarts-for-react";
import "../../lib/echartsTheme";
import { T } from "../../styles/tokens";
import { useFetch } from "../../hooks/useData";
import type { Backtest } from "../../types/data";

/* MAPE tracker (manual §21) — per-FY absolute error bars + the MAPE figure vs
 * the <30% target. Reuses backtest.json (the SAME honest backtest shown on
 * Pipeline) so the two pages cannot disagree. */

export default function MapeTracker() {
  const { data, loading, error } = useFetch<Backtest>("backtest.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 240 }} />;
  if (error || !data)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const cats = data.rows.map((r) => r.fy);
  const absErr = data.rows.map((r) => Math.abs(r.error_pct));
  const barColor = (e: number) => (e < 15 ? T.up : e <= 40 ? T.warn : T.down);
  const mapeOk = data.mape_pct < data.target_mape_pct;

  const option = {
    tooltip: {
      trigger: "axis",
      formatter: (p: { dataIndex: number }[]) => {
        const r = data.rows[p[0].dataIndex];
        return `${r.fy}<br/>model £${r.model_m}m vs realita £${r.actual_m}m<br/>chyba ${r.error_pct > 0 ? "+" : ""}${r.error_pct}%`;
      },
    },
    grid: { top: 16, right: 24, bottom: 32, left: 44 },
    xAxis: { type: "category", data: cats, axisLabel: { fontSize: 11, color: T.text2 } },
    yAxis: {
      type: "value",
      min: 0,
      axisLabel: { fontSize: 11, formatter: "{value}%" },
    },
    series: [
      {
        type: "bar",
        data: absErr.map((e) => ({ value: e, itemStyle: { color: barColor(e) } })),
        barWidth: "52%",
        label: {
          show: true,
          position: "top",
          formatter: (p: { value: number }) => `${p.value.toFixed(0)}%`,
          fontFamily: "JetBrains Mono",
          fontSize: 11,
          color: T.text2,
        },
        markLine: {
          symbol: "none",
          silent: true,
          data: [
            {
              yAxis: data.mape_pct,
              lineStyle: { color: T.gold, width: 1.5, type: "solid" as const },
              label: {
                formatter: `MAPE ${data.mape_pct}%`,
                position: "insideEndTop" as const,
                fontFamily: "JetBrains Mono",
                fontSize: 11,
                color: T.gold,
              },
            },
            {
              yAxis: data.target_mape_pct,
              lineStyle: { color: T.up, width: 1, type: "dashed" as const },
              label: {
                formatter: `cieľ <${data.target_mape_pct}%`,
                position: "insideEndBottom" as const,
                fontFamily: "JetBrains Mono",
                fontSize: 10,
                color: T.up,
              },
            },
          ],
        },
      },
    ],
  };

  return (
    <div>
      <div className="price-stats mono">
        <span>
          MAPE <b className={mapeOk ? "up" : "down"}>{data.mape_pct}%</b> · cieľ
          &lt;{data.target_mape_pct}% {mapeOk ? "✓" : "✗"}
        </span>
      </div>
      <ReactECharts option={option} theme="mano" style={{ height: 220 }} notMerge />
      <div className="chart-footnote">{data.note}</div>
    </div>
  );
}
