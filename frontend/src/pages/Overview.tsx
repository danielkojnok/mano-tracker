import Panel from "../components/ui/Panel";
import KpiRow from "../components/ui/KpiRow";
import ScrambleText from "../components/ui/ScrambleText";
import HeroChart from "../components/charts/HeroChart";

export default function Overview() {
  return (
    <>
      <h1 className="page-title">
        <ScrambleText text="PREHĽAD" />
      </h1>
      <p className="page-subtitle">
        Podporuje insolvenčný pipeline tézu o oživení tržieb MANO pre FY2026–27?
      </p>
      <KpiRow />
      <Panel
        title="Téza: insolvencie vedú tržby MANO o ~24 mesiacov"
        source="Insolvency Service · MANO RNS · model/pipeline.py"
      >
        <HeroChart />
      </Panel>
      <Panel title="IP network graf" source="Gazette appointments × MANO case records" headerRight="F4">
        F4
      </Panel>
    </>
  );
}
