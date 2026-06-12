import KpiCard from "./KpiCard";
import { useFetch } from "../../hooks/useData";
import type { Kpis } from "../../types/data";
import "./KpiRow.css";

const fmt = (n: number) => n.toLocaleString("en-GB");
const arrow = (pct: number) => (pct >= 0 ? "▲" : "▼");

/** Live KPI row — 4 cards from kpis.json. Skeleton while loading, "--" on error. */
export default function KpiRow() {
  const { data, loading, error } = useFetch<Kpis>("kpis.json");

  if (loading) {
    return (
      <div className="kpi-row">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="kpi-skeleton" aria-hidden="true" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="kpi-row">
        <KpiCard label="INSOLVENCIE 12M" value="--" />
        <KpiCard label="IMPLIK. TRŽBY FY27" value="--" isKeyMetric />
        <KpiCard label="ZDRAVIE PIPELINE" value="--" />
        <KpiCard label="CENA AKCIE MANO.L" value="--" />
      </div>
    );
  }

  const yoy = data.insolvencies_yoy_pct;
  const px = data.mano_price_change_pct;
  const healthTrend =
    data.pipeline_health_trend === "neutral" ? null : data.pipeline_health_trend;

  return (
    <div className="kpi-row">
      <KpiCard
        label="INSOLVENCIE 12M"
        value={fmt(data.insolvencies_12m)}
        sub={`${arrow(yoy)} ${Math.abs(yoy).toFixed(1)}% medziročne`}
        trend={yoy >= 0 ? "up" : "down"}
      />
      <KpiCard
        label="IMPLIK. TRŽBY FY27"
        value={`£${data.fy27_revenue_base_m.toFixed(1)}m`}
        sub="model · základný scenár"
        isKeyMetric
      />
      <KpiCard
        label="ZDRAVIE PIPELINE"
        value={data.pipeline_health}
        sub={`${arrow(data.pipeline_health_pct)} ${Math.abs(data.pipeline_health_pct).toFixed(1)}% vážený trh 12m`}
        trend={healthTrend}
        wordState
      />
      <KpiCard
        label="CENA AKCIE MANO.L"
        value={data.mano_price_gbx.toFixed(1)}
        unit="GBX"
        sub={`${arrow(px)} ${Math.abs(px).toFixed(1)}% deň`}
        trend={px >= 0 ? "up" : "down"}
      />
    </div>
  );
}
