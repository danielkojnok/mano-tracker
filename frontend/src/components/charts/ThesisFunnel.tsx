import { useFetch } from "../../hooks/useData";
import type { PipelineOverview, FunnelValues } from "../../types/data";
import { T } from "../../styles/tokens";
import "./ThesisFunnel.css";

/* Conversion funnel — COUNTS ONLY (manual §14). The prior funnel mixed
 * case-counts and money in one picture and its output contradicted the table.
 * Both problems are gone:
 *   - the funnel shows only case counts, all in one unit (počet prípadov);
 *   - money is a SEPARATE explicit step below, reading the SAME fields as the
 *     funnel's last stage, so the two cannot disagree.
 *
 * By default (no `values` prop) it reads pipeline_overview.json — the single
 * source of truth — and Overview renders exactly as before. The Pipeline page
 * passes a `values` prop (computed by the SAME chain via lib/chain.ts) so the
 * funnel reacts live to the sliders; the structure is identical either way. */

const fmtInt = (n: number) => Math.round(n).toLocaleString("en-GB");
const pct = (a: number, b: number) => {
  const r = (a / b) * 100;
  return r >= 10 ? `${r.toFixed(0)}%` : `${r.toFixed(2)}%`;
};

// SVG geometry — generous margins so labels never clip (prior SVG overflowed).
const VB_W = 960;
const VB_H = 300;
const PAD_X = 40;
const BAR_W = 30;
const MAX_BAR_H = 130;
const MID_Y = 150;

interface Stage {
  name: string;
  value: number;
}

interface ThesisFunnelProps {
  /** When supplied (Pipeline what-if), the funnel renders these instead of
   *  fetching. When omitted (Overview), it reads pipeline_overview.json. */
  values?: FunnelValues;
}

export default function ThesisFunnel({ values }: ThesisFunnelProps = {}) {
  const { data, loading, error } = useFetch<PipelineOverview>("pipeline_overview.json");

  // The what-if path skips the loading/error gates — it always has values.
  if (!values) {
    if (loading) return <div className="chart-skeleton" style={{ height: 320 }} />;
    if (error || !data)
      return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;
  }

  // One source of fields: the prop (what-if) or the fetched JSON (Overview).
  // `data` is guaranteed non-null here when `values` is undefined (gated above).
  const vals: FunnelValues = values ?? {
    insolvencies_12m: data!.insolvencies_12m,
    weighted_market: data!.weighted_market,
    referrals: data!.referrals,
    investments: data!.investments,
    completions_capped: data!.completions_capped,
    completions_uncapped: data!.completions_uncapped,
    capacity_cap: data!.capacity_cap,
    arrcc_base_gbp: data!.arrcc_base_gbp,
    revenue_capped_m: data!.revenue_capped_m,
    revenue_uncapped_m: data!.revenue_uncapped_m,
    fy26_realised_m: data!.fy26_realised_m,
    model_vs_real_pct: data!.model_vs_real_pct,
  };

  // COUNTS only — every stage in "počet prípadov". No money in this picture.
  const stages: Stage[] = [
    { name: "INSOLVENCIE 12M", value: vals.insolvencies_12m },
    { name: "VÁŽENÝ TRH", value: vals.weighted_market },
    { name: "DOPYTY", value: vals.referrals },
    // 346 = uncapped demand (theoretical investments before the cap bites) —
    // distinct from 282 live active investments and 291 capacity cap.
    { name: "INVESTÍCIE (dopyt)", value: vals.investments },
    { name: "UKONČENIA (cap)", value: vals.completions_capped },
  ];
  const n = stages.length;
  const maxVal = Math.max(...stages.map((s) => s.value));

  // sqrt scale so the 21.7k → 291 collapse stays legible
  const barH = (v: number) => Math.max(10, (Math.sqrt(v) / Math.sqrt(maxVal)) * MAX_BAR_H);

  const step = (VB_W - 2 * PAD_X - BAR_W) / (n - 1);
  const bars = stages.map((s, i) => {
    const x = PAD_X + i * step;
    const h = barH(s.value);
    return { x, h, top: MID_Y - h / 2, bottom: MID_Y + h / 2, stage: s, i };
  });

  const isFinal = (i: number) => i === n - 1;

  // connector annotation: conversion rate, plus the cap note on the last hop.
  const connectorNote = (i: number, from: Stage, to: Stage) => {
    if (isFinal(i + 1) && vals.investments > vals.capacity_cap) {
      return `cap ${fmtInt(vals.capacity_cap)}`;
    }
    // First hop (INSOLVENCIE → VÁŽENÝ TRH) is the compulsory WEIGHT, not a
    // conversion rate — show it as a multiplier "×1.25" to match the slider
    // and assumptions table (was rendered as "125%", the lone outlier).
    if (i === 0) {
      return `×${(to.value / from.value).toFixed(2)}`;
    }
    return pct(to.value, from.value);
  };

  return (
    <div>
      <svg
        className="funnel-svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Konverzný lievik — počet prípadov"
      >
        {/* connecting trapezoids */}
        {bars.slice(0, -1).map((b, i) => {
          const next = bars[i + 1];
          const x1 = b.x + BAR_W;
          const x2 = next.x;
          const finalFlow = isFinal(i + 1);
          const pts = `${x1},${b.top} ${x2},${next.top} ${x2},${next.bottom} ${x1},${b.bottom}`;
          return (
            <g key={`conn-${i}`}>
              <polygon points={pts} fill={finalFlow ? T.gold : T.signal} fillOpacity={0.28} />
              <text
                x={(x1 + x2) / 2}
                y={MID_Y - 6}
                className="funnel-rate mono"
                textAnchor="middle"
              >
                {connectorNote(i, b.stage, next.stage)}
              </text>
            </g>
          );
        })}

        {/* stage bars + alternating above/below labels */}
        {bars.map((b) => {
          const above = b.i % 2 === 0;
          const final = isFinal(b.i);
          const labelY = above ? b.top - 30 : b.bottom + 24;
          const valueY = above ? b.top - 14 : b.bottom + 40;
          return (
            <g key={`bar-${b.i}`}>
              <rect
                x={b.x}
                y={b.top}
                width={BAR_W}
                height={b.h}
                fill={final ? T.gold : T.signal}
              />
              <text
                x={b.x + BAR_W / 2}
                y={labelY}
                className="funnel-stage"
                textAnchor="middle"
              >
                {b.stage.name}
              </text>
              <text
                x={b.x + BAR_W / 2}
                y={valueY}
                className="funnel-value mono"
                textAnchor="middle"
                fill={final ? T.gold : T.signal}
              >
                {fmtInt(b.stage.value)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* MONEY — a separate, explicit step. Reads the SAME fields as the
          funnel's last stage and ARRCC, so it cannot disagree with it. */}
      <div className="funnel-money mono">
        <span className="fm-step">
          UKONČENIA <b>{fmtInt(vals.completions_capped)}</b>
        </span>
        <span className="fm-op">×</span>
        <span className="fm-step">
          ARRCC <b>£{Math.round(vals.arrcc_base_gbp / 1000)}k</b>
        </span>
        <span className="fm-op">=</span>
        <span className="fm-result">
          TRŽBY <b className="gold">£{vals.revenue_capped_m}m</b>
        </span>
      </div>

      <div className="funnel-explainer">
        Lievik ukazuje len <b>počty prípadov</b> — z UK insolvenčného trhu cez
        konverzné stupne po ukončené prípady. Tržba je samostatný krok vyššie:
        ukončenia × priemerná realizovaná tržba na prípad (ARRCC).
        <br />
        <span className="funnel-defs">
          Pozor na tri rôzne čísla: <b>{fmtInt(vals.investments)}</b> =
          nezastropovaný dopyt (teoretické investície pred capom) ·{" "}
          <b>{fmtInt(vals.capacity_cap)}</b> = capacity cap (auditované FY25
          ukončenia, ročný strop priepustnosti) · aktívne investície dnes (live
          forward book) sú samostatné číslo na stránke Spoločnosť.
        </span>
      </div>

      {/* 3-row reconciliation — the three numbers as one coherent story. */}
      <table className="funnel-numbers mono">
        <tbody>
          <tr>
            <td className="fn-label">Model bez capacity cap</td>
            <td className="fn-value">£{vals.revenue_uncapped_m}m</td>
            <td className="fn-desc">teoretický strop trhu ({fmtInt(vals.investments)} inv.)</td>
          </tr>
          <tr>
            <td className="fn-label">Model s capacity cap</td>
            <td className="fn-value gold">£{vals.revenue_capped_m}m</td>
            <td className="fn-desc">base scenár ({fmtInt(vals.completions_capped)} prípadov)</td>
          </tr>
          <tr className="fn-actual">
            <td className="fn-label">FY26 realised actual</td>
            <td className="fn-value">£{vals.fy26_realised_m}m</td>
            <td className="fn-desc">MANO RNS apríl 2026</td>
          </tr>
        </tbody>
      </table>
      <div className="funnel-gap-note mono">
        Dve medzery: <b>capacity cap</b> (£{vals.revenue_uncapped_m}m → £
        {vals.revenue_capped_m}m, MANO podpíše max ~{fmtInt(vals.capacity_cap)}{" "}
        prípadov/rok) a <b>debtor delays + timing</b> (£{vals.revenue_capped_m}m →
        £{vals.fy26_realised_m}m, {vals.model_vs_real_pct}% pod modelom).
      </div>
    </div>
  );
}
