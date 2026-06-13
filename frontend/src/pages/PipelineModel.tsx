import { useEffect, useRef, useState } from "react";
import Panel from "../components/ui/Panel";
import KpiCard from "../components/ui/KpiCard";
import ScrambleText from "../components/ui/ScrambleText";
import Tag from "../components/ui/Tag";
import ThesisFunnel from "../components/charts/ThesisFunnel";
import TornadoChart from "../components/charts/TornadoChart";
import CohortLag from "../components/charts/CohortLag";
import BacktestTable from "../components/charts/BacktestTable";
import ValuationBridge from "../components/charts/ValuationBridge";
import { useFetch } from "../hooks/useData";
import type { ChainConstants, Backtest, FunnelValues } from "../types/data";
import { chainRevenue } from "../lib/chain";
import "./PipelineModel.css";

type Scenario = "base" | "bear" | "bull";

const SCENARIO_TABS: { key: Scenario; label: string }[] = [
  { key: "base", label: "ZÁKLADNÝ" },
  { key: "bear", label: "PESIMISTICKÝ" },
  { key: "bull", label: "OPTIMISTICKÝ" },
];

const FY26_REALISED_M = 28.0; // pipeline_overview.json fy26_realised_m

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
  const { data: cc } = useFetch<ChainConstants>("chain_constants.json");
  const { data: backtest } = useFetch<Backtest>("backtest.json");

  const [scenario, setScenario] = useState<Scenario>("base");
  const [referral, setReferral] = useState(0.0425);
  const [acceptance, setAcceptance] = useState(0.3);
  const [weight, setWeight] = useState(1.25);
  const [arrcc, setArrcc] = useState(110_000);
  const [applyCap, setApplyCap] = useState(true);
  const seeded = useRef(false);

  // seed sliders from chain_constants.json once (single source of defaults).
  useEffect(() => {
    if (!cc || seeded.current) return;
    seeded.current = true;
    setReferral(cc.referral_rate);
    setAcceptance(cc.acceptance_rate);
    setWeight(cc.compulsory_weight);
    setArrcc(cc.arrcc.base);
  }, [cc]);

  const applyScenario = (s: Scenario) => {
    setScenario(s);
    if (!cc) return;
    setReferral(cc.referral_rate);
    setAcceptance(cc.acceptance_rate);
    setWeight(cc.compulsory_weight);
    setArrcc(cc.arrcc[s]); // scenario only changes ARRCC (bear/base/bull)
    setApplyCap(true);
  };

  // ── THE single-source what-if. Identical chain to pipeline.py. At default
  //    inputs this reproduces get_overview() exactly (1154/346/291/£32.01m). ──
  const insol = cc?.insolvencies_12m ?? 21_716;
  const cap = cc?.capacity_cap ?? 291;
  const chain = chainRevenue({
    insolvencies: insol,
    referralRate: referral,
    acceptanceRate: acceptance,
    compulsoryWeight: weight,
    arrcc,
    capacityCap: cap,
    applyCap,
  });

  const funnelValues: FunnelValues = {
    insolvencies_12m: chain.insolvencies,
    weighted_market: chain.weighted_market,
    referrals: chain.referrals,
    investments: chain.investments,
    completions_capped: chain.completions_capped,
    completions_uncapped: chain.completions_uncapped,
    capacity_cap: chain.capacity_cap,
    arrcc_base_gbp: chain.arrcc_base_gbp,
    revenue_capped_m: chain.revenue_capped_m,
    revenue_uncapped_m: chain.revenue_uncapped_m,
    fy26_realised_m: FY26_REALISED_M,
    model_vs_real_pct:
      Math.round(((FY26_REALISED_M - chain.revenue_capped_m) / chain.revenue_capped_m) * 1000) / 10,
  };

  const utilisation = chain.investments > 0
    ? Math.round((chain.completions_capped / chain.investments) * 100)
    : 100;

  // scenario range bear↔bull at default knobs (ARRCC swapped) for the KPI.
  const bearRev = cc ? chainRevenue({ insolvencies: insol, referralRate: cc.referral_rate, acceptanceRate: cc.acceptance_rate, compulsoryWeight: cc.compulsory_weight, arrcc: cc.arrcc.bear, capacityCap: cap }).revenue_capped_m : 27.64;
  const bullRev = cc ? chainRevenue({ insolvencies: insol, referralRate: cc.referral_rate, acceptanceRate: cc.acceptance_rate, compulsoryWeight: cc.compulsory_weight, arrcc: cc.arrcc.bull, capacityCap: cap }).revenue_capped_m : 43.65;
  const baseRev = cc ? chainRevenue({ insolvencies: insol, referralRate: cc.referral_rate, acceptanceRate: cc.acceptance_rate, compulsoryWeight: cc.compulsory_weight, arrcc: cc.arrcc.base, capacityCap: cap }).revenue_capped_m : 32.01;

  const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`;

  return (
    <>
      <h1 className="page-title">
        <ScrambleText text="PIPELINE MODEL" />
      </h1>
      <p className="page-subtitle">
        Ako sa insolvenčný trh mení na tržby MANO — a čo tie tržby znamenajú pre
        cenu akcie.
      </p>

      {/* ── Model KPI row (4) — all from the single-source chain ── */}
      <div className="kpi-row">
        <KpiCard
          label="PROJEKCIA FY27"
          value={`£${baseRev}m`}
          sub="base scenár · model"
          isKeyMetric
        />
        <KpiCard
          label="ROZSAH BEAR–BULL"
          value={`£${bearRev}–${bullRev}m`}
          sub="ARRCC scenáre · capacity cap"
        />
        <KpiCard
          label="KAPACITNÁ VYUŽITOSŤ"
          value={`${utilisation}%`}
          sub={`${chain.completions_capped} z ${chain.investments} inv. (cap ${cap})`}
          trend={utilisation >= 100 ? null : "down"}
        />
        <KpiCard
          label="MODEL MAPE"
          value={backtest ? `${backtest.mape_pct}%` : "--"}
          sub={backtest ? `cieľ <${backtest.target_mape_pct}% · backtest FY21–25` : "—"}
          trend={backtest && backtest.mape_pct < backtest.target_mape_pct ? "up" : "down"}
          wordState
        />
      </div>

      {/* ── Interactive controls + live funnel ── */}
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
        <button
          className="scenario-tab-btn"
          onClick={() => setApplyCap((v) => !v)}
          title="Zapnúť/vypnúť capacity cap"
        >
          <Tag variant={applyCap ? "gold" : "neutral"}>
            {applyCap ? "CAP ZAP" : "CAP VYP"}
          </Tag>
        </button>
      </div>

      <div className="pipeline-grid">
        <Panel title="Parametre modelu · what-if" source="model/pipeline.py · chain_constants.json">
          <SliderRow
            label="REFERRAL RATE"
            value={referral}
            min={cc?.ranges.referral_rate.min ?? 0.02}
            max={cc?.ranges.referral_rate.max ?? 0.08}
            step={cc?.ranges.referral_rate.step ?? 0.0025}
            format={fmtPct}
            onChange={setReferral}
          />
          <SliderRow
            label="ACCEPTANCE RATE"
            value={acceptance}
            min={cc?.ranges.acceptance_rate.min ?? 0.15}
            max={cc?.ranges.acceptance_rate.max ?? 0.5}
            step={cc?.ranges.acceptance_rate.step ?? 0.01}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            onChange={setAcceptance}
          />
          <SliderRow
            label="COMPULSORY WEIGHT"
            value={weight}
            min={cc?.ranges.compulsory_weight.min ?? 1.0}
            max={cc?.ranges.compulsory_weight.max ?? 1.6}
            step={cc?.ranges.compulsory_weight.step ?? 0.05}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={setWeight}
          />
          <SliderRow
            label="ARRCC (£/prípad)"
            value={arrcc}
            min={cc?.ranges.arrcc.min ?? 60_000}
            max={cc?.ranges.arrcc.max ?? 200_000}
            step={cc?.ranges.arrcc.step ?? 5_000}
            format={(v) => `£${(v / 1000).toFixed(0)}k`}
            onChange={setArrcc}
          />
          <div className="whatif-note mono">
            Posuvníky prepočítavajú <b>identický</b> reťazec ako model. Pri
            defaultných hodnotách reprodukujú headline £32.01m presne.
          </div>
        </Panel>

        <Panel
          title="Konverzný lievik · počet prípadov (live what-if)"
          source="model/pipeline.py chain · lib/chain.ts"
        >
          <ThesisFunnel values={funnelValues} />
        </Panel>
      </div>

      <Panel
        title="Tornado · citlivosť FY27 tržieb na predpoklady"
        source="model/pipeline.py · tornado.json"
      >
        <TornadoChart />
      </Panel>

      <Panel
        title="Lag mechanizmus · 25 mesiacov od kohorty po tržbu"
        source="model/pipeline.py · chain_constants.json"
      >
        <CohortLag />
      </Panel>

      <Panel
        title="Backtest · model vs realita (honest fit)"
        source="MANO RNS realised · model/pipeline.py lagged chain"
      >
        <BacktestTable />
      </Panel>

      <Panel
        title="Model → oceňovací most · tržby implikujú cenu akcie"
        source="model/pipeline.py · valuation_bridge.json · predpoklady: valuationBridge.ts"
      >
        <ValuationBridge />
      </Panel>
    </>
  );
}
