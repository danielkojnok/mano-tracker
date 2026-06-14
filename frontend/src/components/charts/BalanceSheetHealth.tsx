import { useFetch } from "../../hooks/useData";
import type { BalanceSheet } from "../../types/data";
import { T } from "../../styles/tokens";
import "./BalanceSheetHealth.css";

/* Balance-sheet health (manual §06 KPI + §18) — net debt £11.5m, ND/EBITDA
 * 3.7× on a gauge with the 4.0× covenant marked (3.7 < 4.0 → OK, but show
 * proximity), cash deployment 73%, RCF headroom £6m, debtor-delay exposure
 * £4.7m. A gold WARNING badge appears only if ND/EBITDA breaches the covenant
 * (logic present even though not triggered at 3.7×). All from balance_sheet.json. */

const COVENANT = 4.0; // ND/EBITDA covenant threshold

export default function BalanceSheetHealth() {
  const { data, loading, error } = useFetch<BalanceSheet>("balance_sheet.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 240 }} />;
  if (error || !data)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const nd = data.net_debt_ebitda;
  const breach = nd > COVENANT;
  const headroom = Math.round((COVENANT - nd) * 10) / 10;

  // gauge geometry — 0 to GMAX on a horizontal bar. Three label zones with
  // clear vertical separation so nothing overlaps (the prior version mashed the
  // current-value, covenant, and end labels into one band):
  //   top  (y≈18)  — current ND/EBITDA marker label
  //   bar  (y=34..46)
  //   bot  (y≈62)  — covenant tick label + axis endpoints
  const GMAX = 5.0;
  const W = 420;
  const H = 80;
  const PAD = 28; // wider side padding so end labels never clip the viewBox
  const BAR_Y = 34;
  const BAR_H = 12;
  const trackW = W - 2 * PAD;
  const x = (v: number) => PAD + (v / GMAX) * trackW;
  const ndX = x(nd);
  const covX = x(COVENANT);
  // Keep the current-value marker label inside the viewBox even near the ends.
  const ndLabelX = Math.min(Math.max(ndX, PAD + 12), W - PAD - 12);
  // color: green well under, warn approaching, red breach
  const ndColor = breach ? T.down : nd >= COVENANT - 0.5 ? T.warn : T.up;

  return (
    <div className="bsh">
      {/* ND/EBITDA gauge */}
      <div className="bsh-gauge-block">
        <div className="bsh-gauge-head">
          <span className="bsh-gauge-title mono">NET DEBT / EBITDA</span>
          <span className="bsh-gauge-value mono" style={{ color: ndColor }}>
            {nd.toFixed(1)}×
          </span>
          {breach ? (
            <span className="bsh-badge mono bsh-badge-warn">⚠ COVENANT BREACH</span>
          ) : (
            <span className="bsh-badge mono bsh-badge-ok">OK · {headroom}× rezerva</span>
          )}
        </div>
        <svg className="bsh-gauge-svg" viewBox={`0 0 ${W} ${H}`}>
          {/* track */}
          <rect x={PAD} y={BAR_Y} width={trackW} height={BAR_H} fill={T.bg2} />
          {/* filled portion up to ND */}
          <rect x={PAD} y={BAR_Y} width={ndX - PAD} height={BAR_H} fill={ndColor} />

          {/* current value — needle through the bar + label ABOVE it */}
          <line x1={ndX} y1={BAR_Y - 6} x2={ndX} y2={BAR_Y + BAR_H + 6} stroke={ndColor} strokeWidth={2} />
          <text x={ndLabelX} y={BAR_Y - 11} className="bsh-tick bsh-tick-val mono" textAnchor="middle" fill={ndColor}>
            {nd.toFixed(1)}×
          </text>

          {/* covenant — dashed tick + short label BELOW the bar */}
          <line x1={covX} y1={BAR_Y - 4} x2={covX} y2={BAR_Y + BAR_H + 4} stroke={T.down} strokeWidth={1.5} strokeDasharray="3 2" />
          <text x={covX} y={BAR_Y + BAR_H + 18} className="bsh-tick mono" textAnchor="middle" fill={T.down}>
            covenant {COVENANT.toFixed(1)}×
          </text>

          {/* axis endpoints — at the very corners, anchored inward */}
          <text x={PAD} y={BAR_Y + BAR_H + 18} className="bsh-tick mono" textAnchor="middle">0×</text>
          <text x={W - PAD} y={BAR_Y + BAR_H + 18} className="bsh-tick mono" textAnchor="middle">{GMAX.toFixed(1)}×</text>
        </svg>
      </div>

      {/* secondary metrics */}
      <div className="bsh-metrics">
        <div className="bsh-metric">
          <div className="bsh-m-label mono">NET DEBT</div>
          <div className="bsh-m-value mono">£{data.net_debt_m}m</div>
          <div className="bsh-m-sub mono">RCF £{data.rcf_drawn_m}m z £{data.rcf_facility_m}m</div>
        </div>
        <div className="bsh-metric">
          <div className="bsh-m-label mono">RCF HEADROOM</div>
          <div className="bsh-m-value mono">£{data.rcf_headroom_m}m</div>
          <div className="bsh-m-sub mono">dostupná likvidita</div>
        </div>
        <div className="bsh-metric">
          <div className="bsh-m-label mono">CASH DEPLOYMENT</div>
          <div className="bsh-m-value mono">{data.cash_deployment_pct}%</div>
          <div className="bsh-m-sub mono">kapitál nasadený do prípadov</div>
        </div>
        <div className="bsh-metric">
          <div className="bsh-m-label mono">DEBTOR DELAY EXPOZÍCIA</div>
          <div className="bsh-m-value mono warn">£{data.debtor_delay_exposure_m}m</div>
          <div className="bsh-m-sub mono">
            provízie £{data.potential_provision_low_m}–{data.potential_provision_high_m}m
          </div>
        </div>
      </div>
    </div>
  );
}
