import "./Header.css";
import { useFetch } from "../../hooks/useData";
import type { Kpis } from "../../types/data";

/** Sticky header (z-20) — DESIGN-MANUAL.md §09.
 *  Quotes share the same kpis.json source as the ticker. */
export default function Header() {
  const { data: kpis } = useFetch<Kpis>("kpis.json");

  const px = kpis?.mano_price_change_pct ?? 0;
  const yoy = kpis?.insolvencies_yoy_pct ?? 0;

  return (
    <header className="app-header">
      <div className="header-brand">
        <img src="/mano-tracker/logo-dark.png" alt="MANO TRACKER logo" style={{ height: "40px", width: "auto" }} />
        <div>
          <div className="header-wordmark">MANO TRACKER</div>
          <div className="header-subtitle mono">UK INSOLVENČNÝ PREDSTIH ~24 MES.</div>
        </div>
      </div>
      <div className="header-quotes mono">
        {kpis ? (
          <>
            <span>
              MANO.L {kpis.mano_price_gbx.toFixed(1)}{" "}
              <span className={px >= 0 ? "up" : "down"}>
                {px >= 0 ? "▲" : "▼"}{Math.abs(px).toFixed(1)}%
              </span>
            </span>
            <span>
              INSOLV 12M {kpis.insolvencies_12m.toLocaleString("en-GB")}{" "}
              <span className={yoy >= 0 ? "up" : "down"}>
                {yoy >= 0 ? "▲" : "▼"}{Math.abs(yoy).toFixed(1)}%
              </span>
            </span>
          </>
        ) : (
          <span>MANO.L -- · INSOLV 12M --</span>
        )}
      </div>
    </header>
  );
}
