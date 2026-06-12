import Panel from "../components/ui/Panel";
import KpiRow from "../components/ui/KpiRow";
import ScrambleText from "../components/ui/ScrambleText";
import InsolvencyChart from "../components/charts/InsolvencyChart";
import SicTable from "../components/ui/SicTable";
import GazetteFeed from "../components/ui/GazetteFeed";

export default function Market() {
  return (
    <>
      <h1 className="page-title">
        <ScrambleText text="INSOLVENČNÝ TRH" />
      </h1>
      <KpiRow />
      <Panel
        title="Mesačné insolvencie"
        source="Insolvency Service · Insolvency Service Long-Run Series"
      >
        <InsolvencyChart />
      </Panel>
      <div className="two-col">
        <Panel title="Sektory SIC" source="Insolvency Service · jún 2026" headerRight="F4">
          <SicTable />
        </Panel>
        <Panel title="Gazette feed" source="The Gazette · gazette_notices">
          <GazetteFeed />
        </Panel>
      </div>
    </>
  );
}
