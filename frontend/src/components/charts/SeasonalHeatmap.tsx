import ReactECharts from "echarts-for-react";
import "../../lib/echartsTheme";
import { T } from "../../styles/tokens";
import { useFetch } from "../../hooks/useData";
import type { Seasonal } from "../../types/data";

/* Seasonal heatmap (manual §25.6) — month(12) × year matrix of monthly
 * insolvencies, colour scale bg-2 → gold → down. Surfaces seasonality (UK
 * insolvencies peak around the fiscal year-end / Q1). From seasonal.json. */

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export default function SeasonalHeatmap() {
  const { data, loading, error } = useFetch<Seasonal>("seasonal.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 300 }} />;
  if (error || !data || data.cells.length === 0)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const years = data.years;
  const yearIdx = new Map(years.map((y, i) => [y, i]));
  const vals = data.cells.map((c) => c.value);
  const vmin = Math.min(...vals);
  const vmax = Math.max(...vals);

  // [monthIndex, yearIndex, value]
  const seriesData = data.cells.map((c) => [c.month - 1, yearIdx.get(c.year)!, c.value]);

  const option = {
    tooltip: {
      position: "top",
      formatter: (p: { data: [number, number, number] }) =>
        `${years[p.data[1]]}-${String(p.data[0] + 1).padStart(2, "0")}<br/>${p.data[2].toLocaleString("en-GB")} insolvencií`,
    },
    // right margin leaves room for the vertical visualMap; bottom only needs
    // the month-letter axis (the visualMap no longer sits there).
    grid: { top: 8, right: 84, bottom: 28, left: 48 },
    xAxis: {
      type: "category",
      data: MONTHS,
      splitArea: { show: false },
      axisLabel: { fontSize: 11, color: T.text2 },
      axisTick: { show: false },
    },
    yAxis: {
      type: "category",
      data: years.map(String),
      splitArea: { show: false },
      axisLabel: { fontSize: 11, color: T.text2 },
      axisTick: { show: false },
    },
    // Vertical, right-aligned so the min/max labels (e.g. 623 / 2369) never
    // collide with the month-letter x-axis at the bottom.
    visualMap: {
      min: vmin,
      max: vmax,
      calculable: true,
      orient: "vertical",
      right: 8,
      top: "center",
      itemWidth: 12,
      itemHeight: 140,
      text: ["viac", "menej"],
      textStyle: { fontFamily: "JetBrains Mono", fontSize: 10, color: T.text2 },
      inRange: { color: [T.bg2, T.goldDim, T.gold, T.down] },
    },
    series: [
      {
        type: "heatmap",
        data: seriesData,
        label: { show: false },
        itemStyle: { borderColor: T.bg1, borderWidth: 1 },
        emphasis: { itemStyle: { borderColor: T.text, borderWidth: 1 } },
      },
    ],
  };

  return (
    <div>
      <ReactECharts option={option} theme="mano" style={{ height: 300 }} notMerge />
      <div className="chart-footnote mono">
        Riadok = rok, stĺpec = mesiac. Tmavšia = viac insolvencií. Sezónne
        maximá sa koncentrujú v Q1 (koniec daňového roka). Zdroj: Insolvency
        Service.
      </div>
    </div>
  );
}
