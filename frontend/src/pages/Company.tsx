import Panel from "../components/ui/Panel";
import KpiRow from "../components/ui/KpiRow";
import ScrambleText from "../components/ui/ScrambleText";

export default function Company() {
  return (
    <>
      <h1 className="page-title">
        <ScrambleText text="SPOLOČNOSŤ" />
      </h1>
      <KpiRow />
      <Panel title="MANO.L cena & RNS" source="yfinance · Investegate · jún 2026">
        F4
      </Panel>
    </>
  );
}
