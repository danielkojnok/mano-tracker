import KpiCard from "./KpiCard";
import { useFetch } from "../../hooks/useData";
import type { Kpis, Valuation, ManoKpis } from "../../types/data";

const fmt = (n: number) => n.toLocaleString("en-GB");
const arrow = (pct: number) => (pct >= 0 ? "▲" : "▼");

/** Overview KPI row — combines kpis.json + valuation.json + mano_kpis.json. */
export default function OverviewKpis() {
  const { data: kpis, loading: l1 } = useFetch<Kpis>("kpis.json");
  const { data: val, loading: l2 } = useFetch<Valuation>("valuation.json");
  const { data: mano, loading: l3 } = useFetch<ManoKpis>("mano_kpis.json");

  if (l1 || l2 || l3) {
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
        sub="model: £33.8m"
        subTooltip="Model £33.8m = pipeline projekcia z 25-mes lagu × ARRCC base £110k. Realised £28.0m = skutočne inkasované FY26 (MANO RNS). Rozdiel = capacity cap + debtor delays."
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
