/* chain.ts — the ONE transparent funnel chain, in TypeScript.
 *
 * This is the SOLE place the frontend recomputes a model number, and it exists
 * only for the Pipeline page's live slider what-if. It is a 1:1 port of
 * model/pipeline.py::chain_revenue_m — SAME operations, SAME rounding, SAME
 * order — so at the default inputs (from chain_constants.json) it reproduces
 * get_overview() exactly: 1,154 referrals / 346 investments / 291 completions
 * / £32.01m. The consistency self-check verifies this equality.
 *
 *   weighted_market = round(insolvencies × compulsory_weight)
 *   referrals       = round(weighted_market × referral_rate)
 *   investments     = round(referrals × acceptance_rate)
 *   completions     = min(investments, capacity_cap)        ← cap bites here
 *   revenue_m       = round2(completions × arrcc / 1e6)
 */

export interface ChainInputs {
  insolvencies: number;
  referralRate: number;
  acceptanceRate: number;
  compulsoryWeight: number;
  arrcc: number;
  capacityCap: number;
  applyCap?: boolean;
}

export interface ChainResult {
  insolvencies: number;
  weighted_market: number;
  referrals: number;
  investments: number;
  completions_uncapped: number;
  completions_capped: number;
  capacity_cap: number;
  arrcc_base_gbp: number;
  revenue_capped_m: number;
  revenue_uncapped_m: number;
  capped: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function chainRevenue({
  insolvencies,
  referralRate,
  acceptanceRate,
  compulsoryWeight,
  arrcc,
  capacityCap,
  applyCap = true,
}: ChainInputs): ChainResult {
  const weighted_market = Math.round(insolvencies * compulsoryWeight);
  const referrals = Math.round(weighted_market * referralRate);
  const investments = Math.round(referrals * acceptanceRate);
  const completions_capped = applyCap
    ? Math.min(investments, capacityCap)
    : investments;
  return {
    insolvencies: Math.round(insolvencies),
    weighted_market,
    referrals,
    investments,
    completions_uncapped: investments,
    completions_capped,
    capacity_cap: capacityCap,
    arrcc_base_gbp: arrcc,
    revenue_capped_m: round2((completions_capped * arrcc) / 1e6),
    revenue_uncapped_m: round2((investments * arrcc) / 1e6),
    capped: applyCap && investments > capacityCap,
  };
}
