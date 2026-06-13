import KpiCard from "./KpiCard";
import { useFetch } from "../../hooks/useData";
import type { Kpis, Valuation, ManoKpis, PipelineOverview } from "../../types/data";

const fmt = (n: number) => n.toLocaleString("en-GB");
const arrow = (pct: number) => (pct >= 0 ? "▲" : "▼");

/** Overview KPI row — combines kpis.json + valuation.json + mano_kpis.json
 *  + pipeline_overview.json (single source of truth for model numbers). */
export default function OverviewKpis() {
  const { data: kpis, loading: l1 } = useFetch<Kpis>("kpis.json");
  const { data: val, loading: l2 } = useFetch<Valuation>("valuation.json");
  const { data: mano, loading: l3 } = useFetch<ManoKpis>("mano_kpis.json");
  const { data: ov, loading: l4 } = useFetch<PipelineOverview>("pipeline_overview.json");

  if (l1 || l2 || l3 || l4) {
    return (
      <div className="kpi-row">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="kpi-skeleton" aria-hidden="true" />
        ))}
      </div>
    );
  }

  const fy26 = mano?.fy_series.find((f) => f.fy === "FY26");
  const yoy = kpis?.insolvencies_yoy_pct ?? 0;
  const arrccK = ov ? Math.round(ov.arrcc_base_gbp / 1000) : 110;

  return (
    <div className="kpi-row">
      <KpiCard
        label="INSOLVENCIE 12M"
        value={kpis ? fmt(kpis.insolvencies_12m) : "--"}
        sub={`${arrow(yoy)} ${Math.abs(yoy).toFixed(1)}% medziročne`}
        trend={yoy >= 0 ? "up" : "down"}
      />
      <KpiCard
        label="REALISED REVENUE FY26"
        value={fy26 ? `£${fy26.realised_m.toFixed(1)}m` : "--"}
        sub={ov ? `model: £${ov.revenue_capped_m}m` : "model: --"}
        subTooltip={
          ov
            ? `Model £${ov.revenue_capped_m}m = ${ov.completions_capped} ukončení (capacity cap) × ARRCC base £${arrccK}k. Realised £${ov.fy26_realised_m}m = skutočne inkasované FY26 (MANO RNS). Rozdiel ${ov.model_vs_real_pct}% = debtor delays + timing.`
            : undefined
        }
      />
      <KpiCard
        label="FORWARD BOOK"
        value={val ? `£${val.forward_book_m}m` : "--"}
        sub={`▲37% · £${val?.large_cases_m ?? "--"}m veľké prípady`}
        trend="up"
      />
      <KpiCard
        label="CENA MANO.L"
        value={val ? val.price_gbx.toFixed(1) : "--"}
        unit="GBX"
        sub={`vs Singer ${val?.singer_target_gbx ?? "--"}p`}
        isKeyMetric
      />
    </div>
  );
}
