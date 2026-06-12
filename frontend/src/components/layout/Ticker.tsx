import "./Ticker.css";
import { useFetch } from "../../hooks/useData";
import type { GazetteRecent, Kpis } from "../../types/data";

/* Live ticker — kpis.json + last 10 gazette notices.
 * The ONLY allowed infinite loop in the app (manual §19). */

const FALLBACK = "MANO TRACKER · NAČÍTAVAM FEED…";

export default function Ticker() {
  const { data: kpis } = useFetch<Kpis>("kpis.json");
  const { data: gazette } = useFetch<GazetteRecent>("gazette_recent.json");

  const items: string[] = [];

  if (kpis) {
    const pxArrow = kpis.mano_price_change_pct >= 0 ? "▲" : "▼";
    const yoyArrow = kpis.insolvencies_yoy_pct >= 0 ? "▲" : "▼";
    items.push(
      `MANO.L ${kpis.mano_price_gbx.toFixed(1)} ${pxArrow}${Math.abs(kpis.mano_price_change_pct).toFixed(1)}%`,
      `INSOLV 12M ${kpis.insolvencies_12m.toLocaleString("en-GB")} ${yoyArrow}${Math.abs(kpis.insolvencies_yoy_pct).toFixed(1)}%`,
      `FY27 BASE £${kpis.fy27_revenue_base_m.toFixed(1)}m`,
    );
  }

  if (gazette) {
    for (const n of gazette.notices.slice(0, 10)) {
      items.push(`${n.date} ${n.company_name} ${n.display_type}`);
    }
  }

  const line = items.length > 0 ? items.join(" · ") : FALLBACK;

  return (
    <div className="ticker mono" aria-hidden="true">
      <div className="ticker-track">
        <span>{line} · </span>
        <span>{line} · </span>
      </div>
    </div>
  );
}
