import ReactECharts from "echarts-for-react";
import "../../lib/echartsTheme";
import { T } from "../../styles/tokens";
import { useFetch } from "../../hooks/useData";
import type { InsolTimeseries } from "../../types/data";

/* Hero chart — téza: insolvencie vedú tržby MANO o ~25 mesiacov.
 * Series semantics per manual §07: cyan = lead indicator, gold = MANO
 * actuals, green dashed = projection. */

const LEAD_MONTHS = 25;

/* MANO realised revenue — fiscal year end = March. Source: MANO RNS. */
const MANO_REVENUE: [string, number][] = [
  ["2019-03", 27.0],
  ["2020-03", 13.2],
  ["2021-03", 20.7],
  ["2022-03", 20.4],
  ["2023-03", 26.8],
  ["2024-03", 26.1],
  ["2025-03", 26.7],
];

const PROJ = { base: 33.8, bear: 28.0, bull: 45.0 };
const PROJ_RANGE = ["2025-03", "2027-03"];

const RNS_EVENTS = [
  ["2021-06", "FY21 RESULTS"],
  ["2022-06", "FY22 RESULTS"],
  ["2023-06", "FY23 RESULTS"],
  ["2024-06", "FY24 RESULTS"],
  ["2025-06", "FY25 RESULTS"],
] as const;

function shiftMonths(ym: string, months: number): string {
  const [y, m] = ym.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export default function HeroChart() {
  const { data, loading, error } = useFetch<InsolTimeseries>(
    "insolvency_timeseries.json",
  );

  if (loading) return <div className="chart-skeleton" aria-hidden="true" />;
  if (error || !data)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const shifted: [string, number][] = data.series.map((p) => [
    shiftMonths(p.date, LEAD_MONTHS),
    p.total,
  ]);

  const option = {
    tooltip: { trigger: "axis" },
    legend: {
      bottom: 0,
      data: ["Insolvencie +25m (lead)", "Skutočné tržby MANO", "Projekcia FY27"],
    },
    grid: { top: 32, right: 56, bottom: 64, left: 56 },
    xAxis: {
      type: "time",
      min: "2019-01",
      axisLabel: { hideOverlap: true }, // Law 7 — skip, never rotate
    },
    yAxis: [
      {
        type: "value",
        name: "INSOLV / MES.",
        nameTextStyle: { fontSize: 10, color: T.text2 },
      },
      {
        type: "value",
        name: "TRŽBY £m",
        nameTextStyle: { fontSize: 10, color: T.text2 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: "Insolvencie +25m (lead)",
        type: "line",
        data: shifted,
        smooth: false,
        symbol: "none",
        lineStyle: { color: T.signal, width: 1.5 },
        itemStyle: { color: T.signal },
        areaStyle: { color: T.signal, opacity: 0.15 },
        sampling: "lttb", // manual §07 — decimation over 500 points
      },
      {
        name: "Skutočné tržby MANO",
        type: "bar",
        yAxisIndex: 1,
        data: MANO_REVENUE,
        barWidth: 18,
        itemStyle: { color: T.gold },
        markLine: {
          symbol: "none",
          silent: true,
          lineStyle: { color: T.goldDim, type: "dashed", width: 1 },
          label: {
            fontFamily: "JetBrains Mono",
            fontSize: 10,
            color: T.goldDim,
            position: "insideEndTop",
          },
          data: RNS_EVENTS.map(([date, label]) => ({
            xAxis: date,
            label: { formatter: label },
          })),
        },
      },
      {
        name: "Projekcia FY27",
        type: "line",
        yAxisIndex: 1,
        data: PROJ_RANGE.map((d) => [d, PROJ.base]),
        symbol: "none",
        lineStyle: { color: T.up, type: "dashed", width: 1.5 },
        itemStyle: { color: T.up },
      },
      // bear/bull band — invisible base line + stacked fill @10% (manual §07)
      {
        name: "band-low",
        type: "line",
        yAxisIndex: 1,
        stack: "band",
        data: PROJ_RANGE.map((d) => [d, PROJ.bear]),
        symbol: "none",
        lineStyle: { opacity: 0 },
        tooltip: { show: false },
      },
      {
        name: "band-span",
        type: "line",
        yAxisIndex: 1,
        stack: "band",
        data: PROJ_RANGE.map((d) => [d, PROJ.bull - PROJ.bear]),
        symbol: "none",
        lineStyle: { opacity: 0 },
        areaStyle: { color: T.up, opacity: 0.1 },
        tooltip: { show: false },
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      theme="mano"
      style={{ height: 420 }}
      notMerge
    />
  );
}
