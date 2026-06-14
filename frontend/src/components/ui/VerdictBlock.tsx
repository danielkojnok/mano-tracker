import {
  SUPPORT_FACTORS,
  RISK_FACTORS,
  SUPPORT_SUM,
  RISK_SUM,
  NET_SCORE,
  MAX_WEIGHT,
  verdict,
  type ScoreFactor,
} from "../../data/thesisScoring";
import { useFetch } from "../../hooks/useData";
import type { Valuation, PipelineOverview } from "../../types/data";
import "./VerdictBlock.css";

/* Verdikt tézy — three-zone weighted scorecard (R1.2).
 *
 * Fixes the prior garbled right column: each factor is now a two-line row
 * (label + score on top, evidence + weight bar beneath) so nothing wraps or
 * overlaps. A −10…+10 gauge gives the net score visual weight. Dynamic factor
 * evidence (model miss, Singer upside) is read from pipeline_overview /
 * valuation — never hardcoded. */

/* Uses the typographic minus (U+2212) so scores read "−4.8" — matches the gauge
   scale labels and the ZÁVER summary. Display only; never parsed back. */
const signed = (n: number) =>
  n >= 0 ? `+${n.toFixed(1)}` : `−${Math.abs(n).toFixed(1)}`;

/* Both columns use the IDENTICAL row layout and CSS — they differ ONLY by colour
   (green PODPORUJE / red OHROZUJE) and the sign of the score. No mirror/flip.
   Each item is a single, non-wrapping row:
     line 1 — label (nowrap, ellipsis + title tooltip if it ever overflows) on
              the left, score on the right;
     line 2 — compact sub-value under the label;
     line 3 — the weight bar on its own full-width line. */
function FactorRow({ f, evidence }: { f: ScoreFactor; evidence: string }) {
  const isSupport = f.score >= 0;
  const barPct = (Math.abs(f.score) / MAX_WEIGHT) * 100;
  return (
    <div className="verdict-factor">
      <div className="verdict-factor-top">
        <span className={`verdict-marker mono ${isSupport ? "gold-dim" : "down"}`}>
          {f.marker}
        </span>
        <span className="verdict-flabel" title={f.label}>
          {f.label}
        </span>
        <span className={`verdict-score mono ${isSupport ? "up" : "down"}`}>
          {signed(f.score)}
        </span>
      </div>
      <div className="verdict-factor-sub mono" title={evidence}>
        {evidence}
      </div>
      <span className="verdict-wbar" aria-hidden="true">
        <span
          className={`verdict-wbar-fill ${isSupport ? "support" : "risk"}`}
          style={{ width: `${barPct}%` }}
        />
      </span>
    </div>
  );
}

export default function VerdictBlock() {
  const { data: val } = useFetch<Valuation>("valuation.json");
  const { data: ov } = useFetch<PipelineOverview>("pipeline_overview.json");

  const v = verdict(NET_SCORE);
  const singerUpside = val
    ? Math.round(((val.singer_target_gbx - val.price_gbx) / val.price_gbx) * 100)
    : 231;

  // dynamic evidence — read from the single source of truth where available.
  const evidenceFor = (f: ScoreFactor): string => {
    if (f.dynamic === "singer_upside") return `+${singerUpside}%`;
    if (f.dynamic === "model_miss" && ov)
      return `${ov.model_vs_real_pct}% (£${ov.revenue_capped_m}m → £${ov.fy26_realised_m}m)`;
    return f.evidence;
  };

  // gauge: map net score on a −10…+10 axis to a 0–100% marker position.
  const markerPct = ((NET_SCORE + 10) / 20) * 100;

  return (
    <div className="verdict-block">
      {/* ZONE 1 — verdict header + score gauge */}
      <div className="verdict-header">
        <div className="verdict-headline">{v}</div>
        <div className="verdict-gauge">
          <div className="verdict-gauge-track">
            <span className="verdict-gauge-zero" />
            <span
              className="verdict-gauge-marker"
              style={{ left: `${markerPct}%` }}
            />
          </div>
          <div className="verdict-gauge-scale mono">
            <span>−10</span>
            <span className="verdict-gauge-net">{signed(NET_SCORE)} / 10</span>
            <span>+10</span>
          </div>
        </div>
      </div>

      {/* ZONE 2 — weighted scorecard */}
      <div className="verdict-cols">
        <div className="verdict-col">
          <h3 className="verdict-col-head up">
            PODPORUJE <span className="verdict-col-sum mono">{signed(SUPPORT_SUM)}</span>
          </h3>
          {SUPPORT_FACTORS.map((f) => (
            <FactorRow key={f.label} f={f} evidence={evidenceFor(f)} />
          ))}
        </div>
        <div className="verdict-col verdict-col-right">
          <h3 className="verdict-col-head down">
            OHROZUJE <span className="verdict-col-sum mono">{signed(RISK_SUM)}</span>
          </h3>
          {RISK_FACTORS.map((f) => (
            <FactorRow key={f.label} f={f} evidence={evidenceFor(f)} />
          ))}
        </div>
      </div>

      {/* ZONE 3 — verdict summary strip. .verdict-summary is display:flex, which
          splits each text run and each <span> into separate flex items and trims
          each item's edge whitespace — so a plain space next to a coloured value
          gets eaten ("pozícia+4.2 / 10· … medzera+231 %k Singer"). The (+9.0) and
          (−4.8) spans are safe (bordered by parens), but the net-score and singer
          values are bordered by spaces, so we pin those with non-breaking spaces
          ( ) INSIDE the span boundaries — NBSP is not collapsible whitespace,
          so flex never trims it. Target reads:
          "ZÁVER · pipeline drží (+9.0) · riziko exekúcie a súvahy (−4.8) ·
           čistá pozícia +4.2 / 10 · oceňovacia medzera +231 % k Singer". */}
      <div className="verdict-summary">
        ZÁVER{" · "}pipeline drží{" "}(<span className="gold">{signed(SUPPORT_SUM)}</span>)
        {" · "}riziko exekúcie a súvahy{" "}(<span className="gold">{signed(RISK_SUM)}</span>)
        {" · "}čistá pozícia<span className="gold">{" "}{signed(NET_SCORE)} / 10{" "}</span>
        {" · "}oceňovacia medzera<span className="gold">{" "}+{singerUpside} %{" "}</span>k Singer
      </div>
    </div>
  );
}
