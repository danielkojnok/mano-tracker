import { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import "../../lib/echartsTheme";
import { T } from "../../styles/tokens";
import { useFetch } from "../../hooks/useData";
import type { InsolTimeseries, ManoKpis, PipelineOverview } from "../../types/data";
import "./HeroChart.css";

/* Hero chart — téza: insolvencie vedú realised revenue MANO o ~25 mesiacov.
 *
 * Two y-axes (manual §07): the insolvency LINE lives on its own left axis
 * (hundreds/mo) so it can never fly off-screen against the £m revenue axis
 * on the right. A two-state toggle (REÁLNY ČAS | POSUN +25 MES.) lets the
 * reader discover the lead-lag alignment; shifted view reveals the FY27
 * projection band (bear/base/bull from pipeline_overview.scenarios).
 *
 * ALL model numbers come from pipeline_overview.json. The frontend computes
 * none of them. */

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

const PROJ_RANGE = [ts("2026-09"), ts("2027-03")]; // FY27 horizon

export default function HeroChart() {
  const { data: insol, loading: l1, error: e1 } = useFetch<InsolTimeseries>(
    "insolvency_timeseries.json",
  );
  const { data: mano, loading: l2, error: e2 } = useFetch<ManoKpis>(
    "mano_kpis.json",
  );
  const { data: ov, loading: l3, error: e3 } = useFetch<PipelineOverview>(
    "pipeline_overview.json",
  );

  const [shifted, setShifted] = useState(false);

  // Mobile (≤768) only: the full ~9-year span is unreadable on a phone, so we
  // default the visible window to recent years and let the finger pan back
  // through history (desktop is unaffected — no dataZoom is added there).
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (l1 || l2 || l3) return <div className="chart-skeleton" aria-hidden="true" />;
  if (e1 || e2 || e3 || !insol || !mano || !ov)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const shift = shifted ? ov.lag_total_months : 0;

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

  const cyanName = shifted
    ? `Insolvencie +${shift}m (posunuté)`
    : "Insolvencie (reálny čas)";

  // FY27 projection band (bear..bull) — only when shifted, drawn on revenue axis.
  const projectionSeries = shifted
    ? [
        {
          name: "Projekcia FY27 (base)",
          type: "line",
          yAxisIndex: 1,
          data: PROJ_RANGE.map((d) => [d, ov.scenarios.base]),
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { color: T.up, type: "dashed" as const, width: 2 },
          itemStyle: { color: T.up },
          z: 5,
        },
        {
          name: "band-low",
          type: "line",
          yAxisIndex: 1,
          stack: "band",
          data: PROJ_RANGE.map((d) => [d, ov.scenarios.bear]),
          symbol: "none",
          lineStyle: { opacity: 0 },
          tooltip: { show: false },
          silent: true,
        },
        {
          name: "band-span",
          type: "line",
          yAxisIndex: 1,
          stack: "band",
          data: PROJ_RANGE.map((d) => [d, ov.scenarios.bull - ov.scenarios.bear]),
          symbol: "none",
          lineStyle: { opacity: 0 },
          areaStyle: { color: T.up, opacity: 0.1 },
          tooltip: { show: false },
          silent: true,
        },
      ]
    : [];

  const legendData = [cyanName, "Realised revenue MANO"];
  if (shifted) legendData.push("Projekcia FY27 (base)");

  // FY26 model-vs-real callout — a fixed graphic block in the top-right of the
  // grid, so it can never collide with the x-axis (markPoint did before).
  const fy26Block = fy26
    ? {
        type: "group",
        right: 72,
        top: 48,
        children: [
          {
            type: "rect",
            shape: { x: 0, y: 0, width: 168, height: 58 },
            style: { fill: T.bg2, stroke: T.borderStrong, lineWidth: 1 },
          },
          {
            type: "text",
            left: 10,
            top: 8,
            style: {
              text: `FY26  MODEL £${ov.revenue_capped_m}m`,
              fill: T.text2,
              fontFamily: "JetBrains Mono",
              fontSize: 11,
            },
          },
          {
            type: "text",
            left: 10,
            top: 24,
            style: {
              text: `      REAL  £${ov.fy26_realised_m}m`,
              fill: T.text,
              fontFamily: "JetBrains Mono",
              fontSize: 11,
            },
          },
          {
            type: "text",
            left: 10,
            top: 40,
            style: {
              text: `      ▼ ${ov.model_vs_real_pct}%`,
              fill: T.down,
              fontFamily: "JetBrains Mono",
              fontSize: 11,
            },
          },
        ],
      }
    : null;

  const option = {
    tooltip: { trigger: "axis" },
    legend: { bottom: 0, data: legendData },
    grid: { top: 44, right: 64, bottom: 56, left: 56 },
    graphic: fy26Block ? [fy26Block] : [],
    // Mobile only: a pan-only (zoom-locked) window so the chart opens on recent
    // years with comfortable spacing and the finger pans back through history.
    // The y-axes stay pinned (only the x-window moves). Desktop: no dataZoom.
    dataZoom: isMobile
      ? [
          {
            type: "inside",
            xAxisIndex: 0,
            zoomLock: true, // fixed window width → consistent spacing, pan only
            startValue: ts("2024-01"), // recent ~4y incl. FY26 callout + FY27 proj.
            endValue: ts("2028-03"),
            moveOnMouseMove: true,
          },
        ]
      : undefined,
    xAxis: {
      type: "time",
      min: ts("2019-01"),
      max: ts("2028-03"),
      axisLabel: { hideOverlap: true, fontSize: 12 }, // Law 7 — skip, never rotate
    },
    yAxis: [
      {
        // LEFT — insolvency line. Its own scale (hundreds–thousands/mo) so it
        // is always visible regardless of the £m revenue magnitude.
        type: "value",
        name: "INSOLV / MES.",
        position: "left",
        nameTextStyle: { fontSize: 11, color: T.text2 },
        axisLabel: { fontSize: 11, color: T.text2 },
        splitLine: { show: true },
      },
      {
        // RIGHT — MANO revenue £m.
        type: "value",
        name: "TRŽBY £m",
        position: "right",
        max: 50,
        nameTextStyle: { fontSize: 11, color: T.text2 },
        axisLabel: { fontSize: 11, color: T.text2 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: cyanName,
        type: "line",
        yAxisIndex: 0, // ← bound to the insolvency axis (prior bug: was on £m)
        data: cyan,
        smooth: false,
        symbol: "none",
        lineStyle: { color: T.signal, width: 3 },
        itemStyle: { color: T.signal },
        areaStyle: { color: T.signal, opacity: 0.12 },
        sampling: "lttb",
        z: 3,
      },
      {
        name: "Realised revenue MANO",
        type: "bar",
        yAxisIndex: 1,
        data: revenue,
        barWidth: 20,
        itemStyle: { color: T.gold },
        z: 4,
        markLine: {
          symbol: "none",
          silent: true,
          lineStyle: { color: T.goldDim, type: "dashed", width: 1 },
          label: { show: false },
          data: [{ xAxis: fy26Ts }],
        },
      },
      ...projectionSeries,
    ],
  };

  return (
    <div>
      <div className={`hero-toggle${shifted ? " is-shifted" : ""}`}>
        <button
          type="button"
          className={`hero-toggle-btn${!shifted ? " active" : ""}`}
          onClick={() => setShifted(false)}
        >
          REÁLNY ČAS
        </button>
        <button
          type="button"
          className={`hero-toggle-btn${shifted ? " active" : ""}`}
          onClick={() => setShifted(true)}
        >
          POSUN +{ov.lag_total_months} MES.
        </button>
        {shifted && <span className="hero-thesis-cue mono">✓ TÉZA · zarovnané</span>}
      </div>

      <ReactECharts option={option} theme="mano" style={{ height: 420 }} notMerge />

      <div className="hero-explainer">
        <div className="hero-explainer-text">
          Téza: insolvencie sú leading indikátor MANO tržieb. Firma kupuje
          insolvenčné nároky, vyhrá súd, inkasuje — cyklus trvá ~
          {ov.lag_total_months} mesiacov. Prepni na <b>POSUN +{ov.lag_total_months}{" "}
          MES.</b> a cyan krivka sa zarovná s tržbami: vrchol insolvencií
          predchádza vrcholu tržieb o tento lag.
        </div>
        <div className="hero-explainer-breakdown mono">
          <div className="hero-breakdown-head">ROZKLAD LAGU {ov.lag_total_months} MES.</div>
          <div>{ov.lag_case_months} mes. · vedenie sporu (žaloba → rozsudok)</div>
          <div>{ov.lag_cash_months} mes. · inkaso (rozsudok → cash)</div>
          <div className="hero-breakdown-source">
            Zdroj: model/pipeline.py · MANO outcome statistics FY19–25
          </div>
        </div>
      </div>
    </div>
  );
}
