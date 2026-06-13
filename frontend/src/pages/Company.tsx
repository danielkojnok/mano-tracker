import Panel from "../components/ui/Panel";
import KpiCard from "../components/ui/KpiCard";
import ScrambleText from "../components/ui/ScrambleText";
import { PriceChartFull } from "../components/charts/PriceChart";
import DrawdownChart from "../components/charts/DrawdownChart";
import KpiSmallMultiples from "../components/charts/KpiSmallMultiples";
import ForwardBook from "../components/charts/ForwardBook";
import PeerComparison from "../components/charts/PeerComparison";
import BalanceSheetHealth from "../components/charts/BalanceSheetHealth";
import { useFetch } from "../hooks/useData";
import type { Valuation, Peers } from "../types/data";
import "./Company.css";

/* Company page (R3) — reads only existing data (valuation.json, mano_kpis.json,
 * peers.json, balance_sheet.json, mano_price_history.json). Computes no model
 * number. Numbers match the Overview's sources exactly. */

function CompanyKpis() {
  const { data: val } = useFetch<Valuation>("valuation.json");
  const { data: peers } = useFetch<Peers>("peers.json");
  const mano = peers?.peers.find((p) => p.is_mano);
  const navUpside = val
    ? Math.round(((val.nav_per_share_gbx - val.price_gbx) / val.price_gbx) * 100)
    : null;

  return (
    <div className="kpi-row">
      <KpiCard
        label="CENA MANO.L"
        value={val ? val.price_gbx.toFixed(1) : "--"}
        unit="GBX"
        sub={val ? `vs Singer ${val.singer_target_gbx}p` : "—"}
        isKeyMetric
      />
      <KpiCard
        label="NAV / AKCIA"
        value={val ? `~${val.nav_per_share_gbx}p` : "--"}
        sub={navUpside != null ? `cena ${navUpside}% pod NAV` : "—"}
      />
      <KpiCard
        label="P/B NÁSOBOK"
        value={val ? `${val.pb_ratio.toFixed(1)}×` : "--"}
        sub="najnižší v peer skupine"
      />
      <KpiCard
        label="REALISED ROI"
        value={mano ? `${mano.roi_pct}%` : "--"}
        sub="kumulatívne · najvyšší v skupine"
        trend="up"
        wordState
      />
    </div>
  );
}

export default function Company() {
  return (
    <>
      <h1 className="page-title">
        <ScrambleText text="SPOLOČNOSŤ" />
      </h1>
      <p className="page-subtitle">
        Manolete Partners PLC (LON:MANO.L) — kurz, KPI, súvaha, oceňovanie.
      </p>

      <CompanyKpis />

      <Panel
        title="Cena MANO.L · plná história 2019→dnes s RNS udalosťami"
        source="yfinance · MANO RNS announcements"
      >
        <PriceChartFull />
      </Panel>

      <Panel
        title="Drawdown · prepad pod historickým maximom"
        source="yfinance · odvodené z cenovej histórie"
      >
        <DrawdownChart />
      </Panel>

      <Panel
        title="Prevádzkové KPI · FY19–FY26 (každý graf vlastná mierka)"
        source="MANO RNS · research_02"
      >
        <KpiSmallMultiples />
      </Panel>

      <div className="company-grid">
        <Panel
          title="Forward book · kompozícia"
          source="MANO H1 FY26 · valuation.json"
        >
          <ForwardBook />
        </Panel>
        <Panel
          title="Peer porovnanie · litigation funders"
          source="výročné správy litigation funderov · jún 2026"
        >
          <PeerComparison />
        </Panel>
      </div>

      <Panel
        title="Zdravie súvahy · net debt, covenant, likvidita"
        source="MANO FY26 trading update · apríl 2026"
      >
        <BalanceSheetHealth />
      </Panel>
    </>
  );
}
