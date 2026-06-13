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

export interface ThesisStage {
  name: string;
  value: number;
}

export interface ThesisFlow {
  stages: ThesisStage[];
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
