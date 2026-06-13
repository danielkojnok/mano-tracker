import ReactECharts from "echarts-for-react";
import "../../lib/echartsTheme";
import { T } from "../../styles/tokens";
import { useFetch } from "../../hooks/useData";
import type { InsolTimeseries, ManoKpis } from "../../types/data";

/* Hero chart — téza: insolvencie vedú realised revenue MANO o ~25 mesiacov.
 * Series semantics per manual §07: cyan = lead indicator, gold = MANO
 * actuals, green dashed = projection. */

const LEAD_MONTHS = 25;

/* "YYYY-MM" → ms timestamp — time axis needs unambiguous numeric x,
 * string dates + LTTB sampling silently fail to render. */
function ts(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return Date.UTC(y, m - 1, 1);
}

function shiftMonths(ym: string, months: number): number {
  const [y, m] = ym.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  return Date.UTC(Math.floor(total / 12), total % 12, 1);
}

/* FY label → fiscal year end month (March). FY19 → 2019-03. */
function fyToTs(fy: string): number {
  const year = 2000 + Number(fy.replace("FY", ""));
  return ts(`${year}-03`);
}

const PROJ = { base: 33.8, bear: 28.0, bull: 45.0 };
const PROJ_RANGE = [ts("2026-03"), ts("2027-03")];

/* Every other RNS date — horizontal labels would collide annually (Law 1). */
const RNS_EVENTS: [number, string][] = [
  [ts("2021-06"), "FY21"],
  [ts("2023-06"), "FY23"],
  [ts("2025-06"), "FY25"],
];

export default function HeroChart() {
  const { data: insol, loading: l1, error: e1 } = useFetch<InsolTimeseries>(
    "insolvency_timeseries.json",
  );
  const { data: mano, loading: l2, error: e2 } = useFetch<ManoKpis>(
    "mano_kpis.json",
  );

  if (l1 || l2) return <div className="chart-skeleton" aria-hidden="true" />;
  if (e1 || e2 || !insol || !mano)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const shifted: [number, number][] = insol.series.map((p) => [
    shiftMonths(p.date, LEAD_MONTHS),
    p.total,
  ]);

  const revenue: [number, number][] = mano.fy_series.map((f) => [
    fyToTs(f.fy),
    f.realised_m,
  ]);
  const fy26 = mano.fy_series.find((f) => f.fy === "FY26");
  const fy26Ts = fyToTs("FY26");

  const option = {
    tooltip: { trigger: "axis" },
    legend: {
      bottom: 0,
      data: [
        "Insolvencie +25m (lead)",
        "Realised revenue MANO",
        "Projekcia FY27",
      ],
    },
    grid: { top: 40, right: 56, bottom: 64, left: 56 },
    xAxis: {
      type: "time",
      min: ts("2019-01"),
      max: ts("2028-06"),
      axisLabel: { hideOverlap: true, fontSize: 12 }, // Law 7 — skip, never rotate
    },
    yAxis: [
      {
        type: "value",
        name: "INSOLV / MES.",
        nameTextStyle: { fontSize: 12, color: T.text2 },
        axisLabel: { fontSize: 12 },
      },
      {
        type: "value",
        name: "TRŽBY £m",
        nameTextStyle: { fontSize: 12, color: T.text2 },
        axisLabel: { fontSize: 12 },
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
        lineStyle: { color: T.signal, width: 3 },
        itemStyle: { color: T.signal },
        areaStyle: { color: T.signal, opacity: 0.15 },
        sampling: "lttb", // manual §07 — decimation over 500 points
      },
      {
        name: "Realised revenue MANO",
        type: "bar",
        yAxisIndex: 1,
        data: revenue,
        barWidth: 22,
        itemStyle: { color: T.gold },
        // FY26 is actual vs model — annotate the gap (manual §21)
        markPoint: {
          symbol: "pin",
          symbolSize: 0,
          silent: true,
          data: fy26
            ? [
                {
                  coord: [fy26Ts, fy26.realised_m],
                  value: "model £33.8m",
                  label: {
                    formatter: "model £33.8m",
                    fontFamily: "JetBrains Mono",
                    fontSize: 11,
                    color: T.up,
                    position: "top",
                    distance: 8,
                  },
                },
              ]
            : [],
        },
        markLine: {
          symbol: "none",
          silent: true,
          lineStyle: { color: T.goldDim, type: "dashed", width: 1 },
          // §07 + Law 1: horizontal label above line top, never rotated
          label: {
            rotate: 0,
            position: "end",
            fontFamily: "JetBrains Mono",
            fontSize: 10,
            color: T.goldDim,
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
        lineStyle: { color: T.up, type: "dashed", width: 2 },
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

  return <ReactECharts option={option} theme="mano" style={{ height: 440 }} notMerge />;
}
