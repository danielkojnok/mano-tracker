import Panel from "../components/ui/Panel";
import OverviewKpis from "../components/ui/OverviewKpis";
import ScrambleText from "../components/ui/ScrambleText";
import VerdictBlock from "../components/ui/VerdictBlock";
import HeroChart from "../components/charts/HeroChart";
import ThesisFunnel from "../components/charts/ThesisFunnel";
import PriceChart from "../components/charts/PriceChart";

export default function Overview() {
  return (
    <>
      <h1 className="page-title">
        <ScrambleText text="PREHĽAD" />
      </h1>
      <p className="page-subtitle">
        Podporuje insolvenčný pipeline tézu o oživení tržieb MANO pre FY2026–27?
      </p>

      <OverviewKpis />

      <Panel
        title="Téza: insolvencie vedú realised revenue MANO o ~25 mesiacov"
        source="Insolvency Service · MANO RNS · model/pipeline.py"
      >
        <HeroChart />
      </Panel>

      <Panel title="Téza ako lievik · 12m anualizované" source="model/pipeline.py · MANO RNS FY26">
        <ThesisFunnel />
      </Panel>

      <Panel
        title="Cena MANO.L vs oceňovacie kotvy"
        source="yfinance · Singer Capital Markets note · MANO H1 FY26"
      >
        <PriceChart />
      </Panel>

      <Panel
        title="Verdikt tézy"
        source="MANO FY26 update · model/pipeline.py · weighted scoring framework · jún 2026"
      >
        <VerdictBlock />
      </Panel>
    </>
  );
}
