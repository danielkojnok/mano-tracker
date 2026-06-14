import Panel from "../components/ui/Panel";
import OverviewKpis from "../components/ui/OverviewKpis";
import ScrambleText from "../components/ui/ScrambleText";
import InsolvencyChart from "../components/charts/InsolvencyChart";
import SeasonalHeatmap from "../components/charts/SeasonalHeatmap";
import LeadLagChart from "../components/charts/LeadLagChart";
import PetitionsVsCvl from "../components/charts/PetitionsVsCvl";
import RegionalMap from "../components/charts/RegionalMap";
import IpMap from "../components/charts/IpMap";
import SicTable from "../components/ui/SicTable";
import GazetteFeed from "../components/ui/GazetteFeed";

export default function Market() {
  return (
    <>
      <h1 className="page-title">
        <ScrambleText text="INSOLVENČNÝ TRH" />
      </h1>
      <p className="page-subtitle">
        UK insolvenčný trh ako ~25-mesačný predstih pred tržbami MANO — a či ho
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
          title="Regionálne rozloženie firiem · UK ITL1 mapa"
          source="Companies House enrichment · PSČ → región"
        >
          <RegionalMap />
        </Panel>
        <Panel
          title="Sektory SIC · 12M počet a medziročná zmena"
          source="Insolvency Service record-level · SIC 2-digit"
        >
          <SicTable />
        </Panel>
      </div>

      <Panel title="Trhová štruktúra IP · mapa + filtre · bez fabrikovaných hrán">
        <IpMap />
      </Panel>

      <Panel title="Gazette feed · posledné oznámenia" source="The Gazette · gazette_notices">
        <GazetteFeed />
      </Panel>
    </>
  );
}
