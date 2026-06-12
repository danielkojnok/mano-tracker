import Panel from "../components/ui/Panel";
import KpiRow from "../components/ui/KpiRow";
import ScrambleText from "../components/ui/ScrambleText";

export default function Diagnostics() {
  return (
    <>
      <h1 className="page-title">
        <ScrambleText text="DÁTA & DIAGNOSTIKA" />
      </h1>
      <KpiRow />
      <Panel title="Freshness matrix" source="tracker.db · jún 2026">
        F4
      </Panel>
    </>
  );
}
