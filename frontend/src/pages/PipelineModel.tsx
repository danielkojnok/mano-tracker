import { useEffect, useRef, useState } from "react";
import Panel from "../components/ui/Panel";
import KpiRow from "../components/ui/KpiRow";
import ScrambleText from "../components/ui/ScrambleText";
import Tag from "../components/ui/Tag";
import { useFetch } from "../hooks/useData";
import type { Kpis, PipelineAssumptions } from "../types/data";
import "./PipelineModel.css";

type Scenario = "base" | "bear" | "bull";

const SCENARIO_TABS: { key: Scenario; label: string }[] = [
  { key: "base", label: "ZÁKLADNÝ" },
  { key: "bear", label: "PESIMISTICKÝ" },
  { key: "bull", label: "OPTIMISTICKÝ" },
];

/* Backtest — known MANO actuals vs model. Source: MANO RNS. */
const BACKTEST = [
  { fy: "FY21", model: 18.2, actual: 20.7, err: 12 },
  { fy: "FY22", model: 24.1, actual: 20.4, err: 18 },
  { fy: "FY23", model: 19.6, actual: 26.8, err: 27 },
  { fy: "FY24", model: 14.3, actual: 26.1, err: 45 },
  { fy: "FY25", model: 22.8, actual: 26.7, err: 15 },
];

function errClass(err: number): string {
  if (err < 15) return "up";
  if (err <= 40) return "warn";
  return "down";
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, step, format, onChange }: SliderRowProps) {
  const [flash, setFlash] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const handleChange = (v: number) => {
    onChange(v);
    setFlash(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFlash(false), 600);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className={`slider-row${flash ? " slider-flash" : ""}`}>
      <div className="slider-head">
        <span className="mono slider-label">{label}</span>
        <span className="mono slider-value">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => handleChange(Number(e.target.value))}
        style={{
          background: `linear-gradient(to right, var(--gold) ${pct}%, var(--border) ${pct}%)`,
        }}
      />
    </div>
  );
}

export default function PipelineModel() {
  const { data: kpis } = useFetch<Kpis>("kpis.json");
  const { data: assumptions } = useFetch<PipelineAssumptions>(
    "pipeline_assumptions.json",
  );

  const [scenario, setScenario] = useState<Scenario>("base");
  const [referral, setReferral] = useState(0.0425);
  const [acceptance, setAcceptance] = useState(0.3);
  const [arrcc, setArrcc] = useState(110_000);
  const [lag, setLag] = useState(25);
  const seeded = useRef(false);

  // seed sliders from pipeline_assumptions.json once
  useEffect(() => {
    if (!assumptions || seeded.current) return;
    seeded.current = true;
    setReferral(assumptions.referral_rate);
    setAcceptance(assumptions.acceptance_rate);
    setArrcc(assumptions.arrcc_base);
    setLag(assumptions.lag_months_base);
  }, [assumptions]);

  const applyScenario = (s: Scenario) => {
    setScenario(s);
    if (!assumptions) return;
    setReferral(assumptions.referral_rate);
    setAcceptance(assumptions.acceptance_rate);
    if (s === "base") {
      setArrcc(assumptions.arrcc_base);
      setLag(assumptions.lag_months_base);
    } else if (s === "bear") {
      setArrcc(assumptions.arrcc_pessimistic);
      setLag(assumptions.lag_months_bear);
    } else {
      setArrcc(assumptions.arrcc_optimistic);
      setLag(assumptions.lag_months_bull);
    }
  };

  const insol12m = kpis?.insolvencies_12m ?? 21_716;
  const weight = assumptions?.compulsory_weight ?? 1.25;
  // compulsory ≈ 18% of pool (CH enrichment) — blend the weight, do not
  // apply it to the whole market
  const weightedMarket = insol12m * (1 + 0.18 * (weight - 1));

  const revenueFor = (ref: number, acc: number, arr: number) =>
    (weightedMarket * ref * acc * arr) / 1_000_000;

  const revenue = revenueFor(referral, acceptance, arrcc);
  const baseRev = assumptions?.fy27_base ?? 33.8;
  const bearRev = assumptions?.fy27_pessimistic ?? 28.0;
  const bullRev = assumptions?.fy27_optimistic ?? 45.0;

  const mape =
    BACKTEST.reduce((acc, r) => acc + r.err, 0) / BACKTEST.length;

  return (
    <>
      <h1 className="page-title">
        <ScrambleText text="PIPELINE MODEL" />
      </h1>
      <KpiRow />

      <div className="scenario-tabs">
        {SCENARIO_TABS.map((t) => (
          <button
            key={t.key}
            className="scenario-tab-btn"
            onClick={() => applyScenario(t.key)}
          >
            <Tag variant={scenario === t.key ? "gold" : "neutral"}>{t.label}</Tag>
          </button>
        ))}
      </div>

      <div className="pipeline-grid">
        <Panel
          title="Parametre modelu"
          source={`model/pipeline.py ${assumptions?.model_version ?? "v0.2.1"}`}
        >
          <SliderRow
            label="REFERRAL RATE"
            value={referral}
            min={0.02}
            max={0.08}
            step={0.0025}
            format={(v) => `${(v * 100).toFixed(2)}%`}
            onChange={setReferral}
          />
          <SliderRow
            label="ACCEPTANCE RATE"
            value={acceptance}
            min={0.15}
            max={0.5}
            step={0.01}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            onChange={setAcceptance}
          />
          <SliderRow
            label="ARRCC (£)"
            value={arrcc}
            min={60_000}
            max={200_000}
            step={5_000}
            format={(v) => `£${(v / 1000).toFixed(0)}k`}
            onChange={setArrcc}
          />
          <SliderRow
            label="LAG (MESIACE)"
            value={lag}
            min={18}
            max={36}
            step={1}
            format={(v) => `${v}m`}
            onChange={setLag}
          />
        </Panel>

        <Panel title="Implikované tržby FY27" source="model · prepočet naživo">
          <div className="revenue-display mono">£{revenue.toFixed(1)}m</div>
          <div className="scenario-compare">
            {(
              [
                ["ZÁKLADNÝ", baseRev],
                ["PESIMISTICKÝ", bearRev],
                ["OPTIMISTICKÝ", bullRev],
              ] as const
            ).map(([label, val]) => {
              const delta = val - baseRev;
              return (
                <div className="scenario-cell" key={label}>
                  <div className="mono scenario-cell-label">{label}</div>
                  <div className="mono scenario-cell-value">£{val.toFixed(1)}m</div>
                  <div
                    className={`mono scenario-cell-delta ${delta >= 0 ? "up" : "down"}`}
                  >
                    {delta === 0
                      ? "—"
                      : `${delta > 0 ? "▲" : "▼"}£${Math.abs(delta).toFixed(1)}m`}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel title="Backtest" source="MANO RNS · model/pipeline.py v0.2.1">
        <table className="backtest-table mono">
          <thead>
            <tr>
              <th>ROK</th>
              <th className="num">MODEL</th>
              <th className="num">REALITA</th>
              <th className="num">CHYBA</th>
            </tr>
          </thead>
          <tbody>
            {BACKTEST.map((r) => (
              <tr key={r.fy}>
                <td>{r.fy}</td>
                <td className="num">£{r.model.toFixed(1)}m</td>
                <td className="num">£{r.actual.toFixed(1)}m</td>
                <td className={`num ${errClass(r.err)}`}>{r.err}%</td>
              </tr>
            ))}
            <tr className="mape-row">
              <td colSpan={4}>
                MAPE {mape.toFixed(0)}% · cieľ &lt;30%
              </td>
            </tr>
          </tbody>
        </table>
      </Panel>
    </>
  );
}
