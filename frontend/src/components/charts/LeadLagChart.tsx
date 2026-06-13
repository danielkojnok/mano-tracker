import ReactECharts from "echarts-for-react";
import "../../lib/echartsTheme";
import { T } from "../../styles/tokens";
import { useFetch } from "../../hooks/useData";
import type { LeadLag } from "../../types/data";

/* Lead-lag correlation (manual §25.9) — Pearson corr of monthly insolvencies(t)
 * vs MANO price(t+lag), lag 0–36m. HONEST: the real curve is shown whatever it
 * is. Here it is strongly NEGATIVE at every lag (≈ −0.81 at the model's 25m),
 * which is consistent with the mispricing thesis — the market reads rising
 * insolvencies as a recession signal and is NOT yet pricing MANO's ~25m revenue
 * lead. We mark the 25m model lag as a reference line and caveat it; the
 * revenue-lag evidence lives in the Pipeline backtest. From leadlag.json. */

export default function LeadLagChart() {
  const { data, loading, error } = useFetch<LeadLag>("leadlag.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 300 }} />;
  if (error || !data || data.points.length === 0)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const series: [number, number | null][] = data.points.map((p) => [p.lag, p.corr]);
  const corrAt = data.corr_at_model_lag;

  const option = {
    tooltip: {
      trigger: "axis",
      formatter: (params: { data: [number, number] }[]) => {
        const d = params[0].data;
        const pt = data.points.find((p) => p.lag === d[0]);
        return `lag ${d[0]}m<br/>korelácia ${d[1]}<br/>n=${pt?.n ?? "?"}`;
      },
    },
    grid: { top: 20, right: 24, bottom: 40, left: 52 },
    xAxis: {
      type: "value",
      min: 0,
      max: 36,
      interval: 6,
      name: "lag (mesiace)",
      nameLocation: "middle",
      nameGap: 26,
      nameTextStyle: { fontFamily: "JetBrains Mono", fontSize: 11, color: T.text2 },
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: "value",
      min: -1,
      max: 1,
      interval: 0.5,
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        name: "Korelácia",
        type: "line",
        data: series,
        symbol: "circle",
        symbolSize: 5,
        smooth: false,
        lineStyle: { color: T.signal, width: 2.5 },
        itemStyle: { color: T.signal },
        z: 3,
        markLine: {
          symbol: "none",
          silent: true,
          data: [
            // zero correlation reference
            {
              yAxis: 0,
              lineStyle: { color: T.borderStrong, width: 1, type: "solid" as const },
              label: { show: false },
            },
            // model's assumed 25m lag
            {
              xAxis: data.model_lag,
              lineStyle: { color: T.gold, width: 1.5, type: "dashed" as const },
              label: {
                formatter: `MODEL ${data.model_lag}m`,
                position: "insideEndTop" as const,
                fontFamily: "JetBrains Mono",
                fontSize: 10,
                color: T.gold,
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
          Korelácia @ model lag {data.model_lag}m:{" "}
          <b className="down">{corrAt}</b>
        </span>
        <span className="price-stats-sep">·</span>
        <span>prekryv {data.overlap_months} mesiacov</span>
      </div>
      <ReactECharts option={option} theme="mano" style={{ height: 280 }} notMerge />
      <div className="chart-footnote">
        <b className="down">Korelácia je naprieč všetkými lagmi záporná.</b>{" "}
        {data.caveat} <br />
        <span className="mono" style={{ color: "var(--text-2)", fontSize: 11 }}>
          Zdroj: {data.source}
        </span>
      </div>
    </div>
  );
}
