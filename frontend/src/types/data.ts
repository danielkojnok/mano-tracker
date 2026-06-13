/* Shapes of frontend/public/data/*.json — produced by ingest/export_frontend_data.py (F2). */

export interface Kpis {
  insolvencies_12m: number;
  insolvencies_yoy_pct: number;
  mano_price_gbx: number;
  mano_price_change_pct: number;
  fy27_revenue_base_m: number;
  pipeline_health: string;
  pipeline_health_trend: "up" | "down" | "neutral";
  pipeline_health_pct: number;
  generated_at: string;
}

export interface InsolPoint {
  date: string; // "YYYY-MM"
  cvl: number;
  compulsory: number;
  total: number;
}

export interface InsolTimeseries {
  series: InsolPoint[];
}

export interface IPNode {
  id: string;
  label: string;
  full_name: string;
  total_cases: number;
  primary_region: string | null;
  top_sic_1: string | null;
  top_sic_pct_1: number | null;
  top_sic_2: string | null;
  top_sic_pct_2: number | null;
  top_sic_3: string | null;
  top_sic_pct_3: number | null;
  sweet_spot_cases: number;
  pct_sweet_spot: number;
}

export interface IPNetwork {
  nodes: IPNode[];
  meta: { total_ips: number; total_cases: number; generated_at: string };
}

export interface GazetteNotice {
  date: string;
  company_name: string;
  notice_type: string;
  notice_type_label: string;
  display_type: string; // LIKVIDÁCIA | PETÍCIA | INÉ
}

export interface GazetteRecent {
  notices: GazetteNotice[];
}

export interface ManoFy {
  fy: string;
  realised_m: number;
  completions: number;
  arrcc_k: number;
  roi_pct: number | null;
}

export interface ManoKpis {
  fy_series: ManoFy[];
  source: string;
}

export interface Valuation {
  price_gbx: number;
  singer_target_gbx: number;
  shares_m: number;
  case_nav_m: number;
  nav_per_share_gbx: number;
  forward_book_m: number;
  large_cases_m: number;
  large_cases_pct: number;
  active_investments: number;
  pb_ratio: number;
  source: string;
}

export interface BalanceSheet {
  net_debt_m: number;
  net_debt_ebitda: number;
  cash_deployment_pct: number;
  rcf_facility_m: number;
  rcf_drawn_m: number;
  rcf_headroom_m: number;
  debtor_delay_exposure_m: number;
  potential_provision_low_m: number;
  potential_provision_high_m: number;
  source: string;
}

export interface Peer {
  name: string;
  market_cap: string;
  pb: number;
  roi_pct: number;
  is_mano: boolean;
}

export interface Peers {
  peers: Peer[];
  source: string;
}

/** Single source of truth for every model number on the Overview page.
 *  Produced by model/pipeline.py get_overview(); the frontend computes none
 *  of these — it reads them. Every figure is hand-reproducible from the one
 *  before it (see pipeline.py chain). */
export interface PipelineOverview {
  insolvencies_12m: number;
  compulsory_weight: number;
  weighted_market: number;
  referral_rate: number;
  referrals: number;
  acceptance_rate: number;
  investments: number;
  capacity_cap: number;
  completions_uncapped: number;
  completions_capped: number;
  arrcc_base_gbp: number;
  arrcc_bear_gbp: number;
  arrcc_bull_gbp: number;
  revenue_uncapped_m: number;
  /** HEADLINE — base-scenario model revenue. Use this everywhere. */
  revenue_capped_m: number;
  scenarios: { bear: number; base: number; bull: number };
  fy26_realised_m: number;
  /** (realised − capped) / capped × 100 — negative = realised below model. */
  model_vs_real_pct: number;
  lag_total_months: number;
  lag_case_months: number;
  lag_cash_months: number;
  source: string;
}

export interface PricePoint {
  date: string; // "YYYY-MM-DD"
  close: number; // GBX
}

export interface RnsEvent {
  date: string;
  label: string;
}

export interface PriceHistory {
  series: PricePoint[];
  rns_events: RnsEvent[];
  source: string;
}

/* ── R2 Pipeline page — single-source JSON shapes (model/pipeline.py) ──────── */

export interface SliderRange {
  min: number;
  max: number;
  step: number;
}

/** Every knob the live slider what-if needs to reproduce the chain exactly.
 *  The frontend recompute multiplies these in the SAME order as
 *  pipeline.py::chain_revenue_m and lands on the same headline at defaults. */
export interface ChainConstants {
  insolvencies_12m: number;
  referral_rate: number;
  acceptance_rate: number;
  compulsory_weight: number;
  capacity_cap: number;
  lag_months: number;
  arrcc: { bear: number; base: number; bull: number };
  ranges: {
    referral_rate: SliderRange;
    acceptance_rate: SliderRange;
    compulsory_weight: SliderRange;
    arrcc: SliderRange;
  };
  source: string;
}

export interface BacktestRow {
  fy: string;
  model_m: number;
  actual_m: number;
  error_pct: number;
  capped: boolean;
}

export interface Backtest {
  rows: BacktestRow[];
  mape_pct: number;
  target_mape_pct: number;
  lag_months: number;
  arrcc_base_gbp: number;
  note: string;
  source: string;
}

export interface TornadoRow {
  param: string;
  label: string;
  low_m: number;
  high_m: number;
  swing_m: number;
}

export interface Tornado {
  base_m: number;
  delta_pct: number;
  rows: TornadoRow[];
  note: string;
  source: string;
}

export interface BridgeLeg {
  pbt_m: number;
  net_m: number;
  eps_p: number;
  price_p: number;
  upside_pct: number;
}

export interface BridgeRow {
  scenario: "bear" | "base" | "bull";
  revenue_m: number;
  base: BridgeLeg;
  low: BridgeLeg;
  high: BridgeLeg;
}

export interface ValuationBridge {
  rows: BridgeRow[];
  assumptions: {
    pbt_margin_base: number;
    pbt_margin_low: number;
    pbt_margin_high: number;
    tax_rate: number;
    pe_multiple: number;
    shares_m: number;
  };
  current_price_p: number;
  singer_target_p: number;
  source: string;
}

/** Optional values for ThesisFunnel (Pipeline what-if). When omitted the
 *  funnel reads pipeline_overview.json (Overview's static base). */
export interface FunnelValues {
  insolvencies_12m: number;
  weighted_market: number;
  referrals: number;
  investments: number;
  completions_capped: number;
  completions_uncapped: number;
  capacity_cap: number;
  arrcc_base_gbp: number;
  revenue_capped_m: number;
  revenue_uncapped_m: number;
  fy26_realised_m: number;
  model_vs_real_pct: number;
}

export interface PipelineAssumptions {
  referral_rate: number;
  acceptance_rate: number;
  arrcc_base: number;
  arrcc_pessimistic: number;
  arrcc_optimistic: number;
  lag_months_base: number;
  lag_months_bear: number;
  lag_months_bull: number;
  compulsory_weight: number;
  fy27_base: number;
  fy27_pessimistic: number;
  fy27_optimistic: number;
  model_version: string;
  calibrated_at: string;
}
