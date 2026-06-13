import { useEffect, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import "../../lib/echartsTheme";
import { T } from "../../styles/tokens";
import { useFetch } from "../../hooks/useData";
import type { InsolTimeseries, ManoKpis } from "../../types/data";
import "./HeroChart.css";

/* Hero chart — téza: insolvencie vedú realised revenue MANO o ~25 mesiacov.
 * Default view shows insolvencies at REAL dates; a lag-shift slider lets the
 * reader discover the ~25m lead by sliding the cyan area forward in time.
 * Series semantics per manual §07: cyan = lead indicator, gold = MANO
 * actuals, green dashed = projection (only shown once shift > 0). */

const THESIS_LAG = 25;

function ts(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return Date.UTC(y, m - 1, 1);
}

/* shift a "YYYY-MM" by N months → ms timestamp (numeric x for time axis) */
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

const MODEL_FY26 = 33.8;

export default function HeroChart() {
  const { data: insol, loading: l1, error: e1 } = useFetch<InsolTimeseries>(
    "insolvency_timeseries.json",
  );
  const { data: mano, loading: l2, error: e2 } = useFetch<ManoKpis>(
    "mano_kpis.json",
  );

  const [shift, setShift] = useState(0);
  const [flash, setFlash] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onShift = (v: number) => {
    setShift(v);
    if (v === THESIS_LAG) {
      setFlash(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setFlash(false), 600);
    }
  };

  if (l1 || l2) return <div className="chart-skeleton" aria-hidden="true" />;
  if (e1 || e2 || !insol || !mano)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const isThesis = shift === THESIS_LAG;
  const showProjection = shift > 0;

  const cyan: [number, number][] = insol.series.map((p) => [
    shiftMonths(p.date, shift),
    p.total,
  ]);

  const revenue: [number, number][] = mano.fy_series.map((f) => [
    fyToTs(f.fy),
    f.realised_m,
  ]);
  const fy26 = mano.fy_series.find((f) => f.fy === "FY26");
  const fy26Ts = fyToTs("FY26");
  const fy26Delta = fy26
    ? Math.round(((fy26.realised_m - MODEL_FY26) / MODEL_FY26) * 100)
    : 0;

  const cyanName =
    shift === 0 ? "Insolvencie (reálny čas)" : `Insolvencie +${shift}m`;

  const projectionSeries = showProjection
    ? [
        {
          name: "Projekcia FY27",
          type: "line",
          yAxisIndex: 1,
          data: PROJ_RANGE.map((d) => [d, PROJ.base]),
          symbol: "none",
          lineStyle: { color: T.up, type: "dashed", width: 2 },
          itemStyle: { color: T.up },
        },
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
      ]
    : [];

  const legendData = [cyanName, "Realised revenue MANO"];
  if (showProjection) legendData.push("Projekcia FY27");

  const option = {
    tooltip: { trigger: "axis" },
    legend: { bottom: 0, data: legendData },
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
        name: cyanName,
        type: "line",
        data: cyan,
        smooth: false,
        symbol: "none",
        lineStyle: { color: T.signal, width: 3 },
        itemStyle: { color: T.signal },
        areaStyle: { color: T.signal, opacity: 0.15 },
        sampling: "lttb",
        animationDuration: 200, // §19 — shift transition
      },
      {
        name: "Realised revenue MANO",
        type: "bar",
        yAxisIndex: 1,
        data: revenue,
        barWidth: 22,
        itemStyle: { color: T.gold },
        // FY26 model-vs-real annotation block, below the bar (issue 5B)
        markPoint: {
          symbol: "rect",
          symbolSize: 0,
          silent: true,
          data: fy26
            ? [
                {
                  coord: [fy26Ts, fy26.realised_m],
                  label: {
                    formatter: `MODEL  £${MODEL_FY26}m\nREAL   £${fy26.realised_m}m\n▼ ${fy26Delta}%`,
                    lineHeight: 15,
                    fontFamily: "JetBrains Mono",
                    fontSize: 11,
                    color: T.text2,
                    rich: {},
                    position: "bottom",
                    distance: 12,
                    align: "left",
                  },
                },
              ]
            : [],
        },
        markLine: {
          symbol: "none",
          silent: true,
          lineStyle: { color: T.goldDim, type: "dashed", width: 1 },
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
      ...projectionSeries,
    ],
  };

  const pct = (shift / 36) * 100;

  return (
    <div>
      <div className={`lag-control${flash ? " lag-flash" : ""}`}>
        <span className="mono lag-label">
          Posun insolvencií (mes.):{" "}
          <span className="lag-value">{shift}</span>
          {isThesis && <span className="lag-thesis-badge">✓ TÉZA</span>}
        </span>
        <input
          type="range"
          min={0}
          max={36}
          step={1}
          value={shift}
          onChange={(e) => onShift(Number(e.target.value))}
          className={isThesis ? "lag-slider-thesis" : ""}
          style={{
            background: `linear-gradient(to right, var(--gold) ${pct}%, var(--border) ${pct}%)`,
          }}
        />
      </div>

      <ReactECharts option={option} theme="mano" style={{ height: 420 }} notMerge />

      <div className="hero-explainer">
        <div className="hero-explainer-text">
          Téza: insolvencie sú leading indikátor MANO tržieb. Firma kupuje
          insolvenčné nároky, vyhrá súd, inkasuje. Tento cyklus trvá ~25
          mesiacov.
        </div>
        <div className="hero-explainer-breakdown mono">
          <div className="hero-breakdown-head">ROZKLAD LAGU 25 MES.</div>
          <div>13 mes. · vedenie sporu (žaloba → rozsudok)</div>
          <div>12 mes. · inkaso (rozsudok → cash)</div>
          <div className="hero-breakdown-source">
            Zdroj: MANO outcome statistics FY19-25 · research_02
          </div>
        </div>
      </div>
    </div>
  );
}
