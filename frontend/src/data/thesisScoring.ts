/* Weighted thesis scorecard — Overview verdict block (R1.1 issue 4).
 *
 * Weights are SUBJECTIVE editorial judgements, deliberately explicit and
 * editable here in one place rather than buried in JSX. Each carries a WHY.
 * Score range: net position clamped to ±10. Verdict thresholds below. */

export interface ScoreFactor {
  /** ◆ for support, ▼ for risk */
  marker: "◆" | "▼";
  label: string;
  evidence: string;
  score: number; // signed; support > 0, risk < 0
}

// ── PODPORUJE (support) ──────────────────────────────────────────────────────
const W_FORWARD_BOOK = 2.0; // pipeline indicator, leading — strongest forward signal
const W_NEW_SIGNINGS = 1.5; // BD expansion working, confirms book growth is real
const W_LARGE_CASE_MIX = 1.5; // higher ARRCC mix lifts revenue per completion
const W_PRICE_VS_TARGET = 2.5; // largest gap, most actionable for an investor
const W_PB_VS_NAV = 1.5; // market discounts fair value — margin of safety

// ── OHROZUJE (risk) ──────────────────────────────────────────────────────────
const W_DEBTOR_DELAYS = -1.5; // direct hit to FY26 PBT via provision
const W_NET_DEBT = -1.0; // covenant watch, limited RCF headroom
const W_ARRCC_SHIFT = -1.5; // structural — lower revenue per case vs FY19 peak
const W_MODEL_MISS = -0.8; // model overstated FY26 — credibility of projection

export const SUPPORT_FACTORS: ScoreFactor[] = [
  { marker: "◆", label: "Forward book ▲37%", evidence: "£67m", score: W_FORWARD_BOOK },
  { marker: "◆", label: "Nové signings ▲23%", evidence: "£32m", score: W_NEW_SIGNINGS },
  { marker: "◆", label: "Veľké prípady mix", evidence: "48% knihy", score: W_LARGE_CASE_MIX },
  { marker: "◆", label: "Cena vs Singer target", evidence: "+231%", score: W_PRICE_VS_TARGET },
  { marker: "◆", label: "P/B vs case NAV", evidence: "0.4× / £42m", score: W_PB_VS_NAV },
];

export const RISK_FACTORS: ScoreFactor[] = [
  { marker: "▼", label: "Debtor delays", evidence: "£4.7m exp.", score: W_DEBTOR_DELAYS },
  { marker: "▼", label: "Net debt/EBITDA", evidence: "3.7×", score: W_NET_DEBT },
  { marker: "▼", label: "ARRCC mix shift", evidence: "£96k vs £204k", score: W_ARRCC_SHIFT },
  { marker: "▼", label: "Model nadhodnotil FY26", evidence: "−17% miss", score: W_MODEL_MISS },
];

export const SUPPORT_SUM = SUPPORT_FACTORS.reduce((a, f) => a + f.score, 0); // +9.0
export const RISK_SUM = RISK_FACTORS.reduce((a, f) => a + f.score, 0); // -4.8
export const NET_SCORE = SUPPORT_SUM + RISK_SUM; // +4.2

export type Verdict = "TÉZA DRŽÍ" | "TÉZA NEUTRÁLNA" | "TÉZA SLABNE";

export function verdict(score: number): Verdict {
  if (score >= 2.0) return "TÉZA DRŽÍ";
  if (score <= -2.0) return "TÉZA SLABNE";
  return "TÉZA NEUTRÁLNA";
}
