import Panel from "../components/ui/Panel";
import OverviewKpis from "../components/ui/OverviewKpis";
import ScrambleText from "../components/ui/ScrambleText";
import ThesisScorecard from "../components/ui/ThesisScorecard";
import HeroChart from "../components/charts/HeroChart";
import SankeyFunnel from "../components/charts/SankeyFunnel";
import ValuationGap from "../components/charts/ValuationGap";

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

      <div className="grid-7-5">
        <Panel title="Téza ako lievik · 12m anualizované" source="model/pipeline.py">
          <SankeyFunnel />
        </Panel>
        <Panel title="Oceňovacia medzera" source="yfinance · Singer · MANO H1 FY26">
          <ValuationGap />
        </Panel>
      </div>

      <Panel
        title="Verdikt tézy"
        source="MANO FY26 update · model/pipeline.py · jún 2026"
      >
        <ThesisScorecard />
      </Panel>
    </>
  );
}
