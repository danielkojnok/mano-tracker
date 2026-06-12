import Panel from "../components/ui/Panel";
import KpiCard from "../components/ui/KpiCard";

export default function PipelineModel() {
  return (
    <>
      <h1 className="page-title">Pipeline model</h1>
      <div className="kpi-row">
        <KpiCard label="MESAČNÉ INSOLVENCIE" value="2,138" sub="▲ 2.8% medziročne" trend="up" />
        <KpiCard label="IMPLIK. TRŽBY FY27" value="£32.4m" sub="model · základný scenár" isKeyMetric />
        <KpiCard label="ZDRAVIE PIPELINE" value="Klesá" sub="▼ 2.3% vážený trh 12m" trend="down" />
        <KpiCard label="CENA AKCIE MANO.L" value="39.3 GBX" sub="▲ 0.8% deň" trend="up" />
      </div>
      <Panel title="Lievik konverzie" source="model · pipeline.py v0.2.1">
        F3
      </Panel>
    </>
  );
}
