import Panel from "../components/ui/Panel";
import KpiCard from "../components/ui/KpiCard";

/* KPI sample values — DESIGN-MANUAL.md §06, hardcoded for F1. */
export default function Overview() {
  return (
    <>
      <h1 className="page-title">Prehľad</h1>
      <div className="kpi-row">
        <KpiCard label="MESAČNÉ INSOLVENCIE" value="2,138" sub="▲ 2.8% medziročne" trend="up" />
        <KpiCard label="IMPLIK. TRŽBY FY27" value="£32.4m" sub="model · základný scenár" isKeyMetric />
        <KpiCard label="ZDRAVIE PIPELINE" value="Klesá" sub="▼ 2.3% vážený trh 12m" trend="down" wordState />
        <KpiCard label="CENA AKCIE MANO.L" value="39.3" unit="GBX" sub="▲ 0.8% deň" trend="up" />
      </div>
      <Panel title="Prehľad trhu" source="Insolvency Service · jún 2026">
        F3
      </Panel>
    </>
  );
}
