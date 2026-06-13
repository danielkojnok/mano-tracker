import ReactECharts from "echarts-for-react";
import "../../lib/echartsTheme";
import { T } from "../../styles/tokens";
import { useFetch } from "../../hooks/useData";
import type { PriceHistory } from "../../types/data";

/* Drawdown underwater (manual §25.8) — % below the running all-time-high over
 * time, red area, showing the trough to ~−93%. Computed from price history
 * only (no model number). The running ATH is a pure transform of the series. */

function toTs(d: string): number {
  return new Date(d + "T00:00:00Z").getTime();
}

export default function DrawdownChart() {
  const { data, loading, error } = useFetch<PriceHistory>("mano_price_history.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 240 }} />;
  if (error || !data)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  let peak = -Infinity;
  const dd: [number, number][] = data.series.map((p) => {
    peak = Math.max(peak, p.close);
    const pct = ((p.close - peak) / peak) * 100; // ≤ 0
    return [toTs(p.date), Math.round(pct * 10) / 10];
  });
  const trough = Math.min(...dd.map((d) => d[1]));

  const option = {
    tooltip: {
      trigger: "axis",
      valueFormatter: (v: number) => `${v}%`,
    },
    grid: { top: 16, right: 24, bottom: 36, left: 48 },
    xAxis: { type: "time", axisLabel: { hideOverlap: true, fontSize: 12 } },
    yAxis: {
      type: "value",
      max: 0,
      min: Math.floor(trough / 10) * 10,
      axisLabel: { fontSize: 11, formatter: "{value}%" },
    },
    series: [
      {
        name: "Drawdown",
        type: "line",
        data: dd,
        symbol: "none",
        lineStyle: { color: T.down, width: 1.5 },
        areaStyle: { color: T.down, opacity: 0.2 },
        z: 2,
      },
    ],
  };

  return (
    <div>
      <div className="price-stats mono">
        <span>
          Najhlbší prepad <b className="down">{trough}%</b> pod historickým
          maximom
        </span>
      </div>
      <ReactECharts option={option} theme="mano" style={{ height: 220 }} notMerge />
    </div>
  );
}
