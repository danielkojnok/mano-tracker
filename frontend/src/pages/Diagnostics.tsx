import Panel from "../components/ui/Panel";
import ScrambleText from "../components/ui/ScrambleText";
import FreshnessMatrix from "../components/charts/FreshnessMatrix";
import MapeTracker from "../components/charts/MapeTracker";
import GazetteExplorer from "../components/charts/GazetteExplorer";
import AssumptionsTable from "../components/charts/AssumptionsTable";

export default function Diagnostics() {
  return (
    <>
      <h1 className="page-title">
        <ScrambleText text="DÁTA & DIAGNOSTIKA" />
      </h1>
      <p className="page-subtitle">
        Vrstva dôvery — čerstvosť zdrojov, presnosť modelu, surové dáta a
        predpoklady. Bez nej je téza len tvrdenie.
      </p>

      <Panel title="Freshness matrix · zdravie zdrojov" source="tracker.db metadata · row counts">
        <FreshnessMatrix />
      </Panel>

      <div className="two-col">
        <Panel
          title="MAPE tracker · presnosť modelu"
          source="MANO RNS realised · model/pipeline.py lagged chain"
        >
          <MapeTracker />
        </Panel>
        <Panel
          title="Predpoklady modelu"
          source="model/pipeline.py · chain_constants.json"
        >
          <AssumptionsTable />
        </Panel>
      </div>

      <Panel
        title="Gazette explorer · virtualizovaný prehliadač oznámení"
        source="The Gazette · gazette_notices (company_name)"
      >
        <GazetteExplorer />
      </Panel>
    </>
  );
}
