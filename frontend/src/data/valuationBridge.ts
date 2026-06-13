/* valuationBridge.ts — EDITABLE ASSUMPTIONS for the model→price bridge.
 *
 * These are JUDGMENT CALLS, not measured facts. They mirror the constants in
 * model/pipeline.py (VB_* block) 1:1; valuation_bridge.json is computed there
 * and is the source the UI renders. This file exists so the assumptions are
 * editable in ONE labelled place with sourced WHY comments, and so the UI can
 * show them tagged as assumptions. If you change a number here, change it in
 * pipeline.py too and re-run the export — the JSON is what gets rendered.
 *
 * The bridge per scenario:
 *   revenue → PBT (×margin) → net (×(1−tax)) → EPS (net/shares, pence)
 *   → implied price (EPS × P/E) → upside vs current price.
 */

export const VALUATION_ASSUMPTIONS = {
  // MANO realised PBT margin has ranged ~7–45% across the cycle; 20% is a
  // mid-cycle estimate. FY26 actual ~6.8% is depressed by debtor delays, so
  // the upside hinges on margin NORMALISATION — hence the low/high band.
  pbtMarginBase: 0.20,
  pbtMarginLow: 0.10, // conservative — debtor delays persist
  pbtMarginHigh: 0.30, // optimistic — large-case mix + margin recovery

  taxRate: 0.25, // UK corporation tax (main rate)
  peMultiple: 13, // Singer ~13× forward P/E (research_05)
  sharesM: 43.9, // valuation.json
} as const;

/** Editable, sourced labels shown in the UI so each number reads as an
 *  assumption with provenance — not a fact. */
export const ASSUMPTION_NOTES: { label: string; value: string; why: string }[] = [
  {
    label: "PBT MARŽA",
    value: "10 / 20 / 30 %",
    why: "MANO realised PBT marža historicky ~7–45%; 20% mid-cycle. FY26 ~6.8% deprimovaná debtor delays → upside závisí od normalizácie.",
  },
  {
    label: "DAŇ",
    value: "25 %",
    why: "UK corporation tax, hlavná sadzba.",
  },
  {
    label: "P/E NÁSOBOK",
    value: "13×",
    why: "Singer ~13× forward P/E (research_05). Single-analyst coverage — referenčné, nie konsenzus.",
  },
  {
    label: "AKCIE",
    value: "43.9 m",
    why: "Počet akcií v obehu (valuation.json).",
  },
];
