import Panel from "../components/ui/Panel";
import OverviewKpis from "../components/ui/OverviewKpis";
import ScrambleText from "../components/ui/ScrambleText";
import InsolvencyChart from "../components/charts/InsolvencyChart";
import SeasonalHeatmap from "../components/charts/SeasonalHeatmap";
import LeadLagChart from "../components/charts/LeadLagChart";
import PetitionsVsCvl from "../components/charts/PetitionsVsCvl";
import RegionalHexMap from "../components/charts/RegionalHexMap";
import IpConstellation from "../components/charts/IpConstellation";
import SicTable from "../components/ui/SicTable";
import GazetteFeed from "../components/ui/GazetteFeed";

export default function Market() {
  return (
    <>
      <h1 className="page-title">
        <ScrambleText text="INSOLVENČNÝ TRH" />
      </h1>
      <p className="page-subtitle">
        UK insolvenčný trh ako ~24-mesačný predstih pred tržbami MANO — a či ho
        trh už cení.
      </p>

      {/* Single source: reuse Overview's KPI row so the model headline (£32.01m)
          and insolvencies (21,716) cannot diverge from Overview. */}
      <OverviewKpis />

      <Panel
        title="Mesačné insolvencie"
        source="Insolvency Service · Long-Run Series"
      >
        <InsolvencyChart />
      </Panel>

      <div className="two-col">
        <Panel
          title="Sezónna matica · mesiac × rok"
          source="Insolvency Service · monthly"
        >
          <SeasonalHeatmap />
        </Panel>
        <Panel
          title="Lead-lag korelácia · insolvencie(t) vs cena(t+lag)"
          source="Insolvency Service · yfinance MANO.L"
        >
          <LeadLagChart />
        </Panel>
      </div>

      <Panel
        title="Petície vs likvidácie · skorší sub-signál"
        source="The Gazette · gazette_notices"
      >
        <PetitionsVsCvl />
      </Panel>

      <div className="two-col">
        <Panel
          title="Regionálne rozloženie firiem · UK hex kartogram"
          source="Companies House enrichment · PSČ → región"
        >
          <RegionalHexMap />
        </Panel>
        <Panel title="Sektory SIC · zoradené podľa 12M" source="Insolvency Service · jún 2026">
          <SicTable />
        </Panel>
      </div>

      <Panel
        title="Trhová štruktúra IP · geografická mapa · bez fabrikovaných hrán"
        source="The Gazette appointments → ip_network (1 175 entít)"
      >
        <IpConstellation />
      </Panel>

      <Panel title="Gazette feed · živé oznámenia" source="The Gazette · gazette_notices">
        <GazetteFeed />
      </Panel>
    </>
  );
}
