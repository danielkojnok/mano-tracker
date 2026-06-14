import { useState } from "react";
import { useFetch } from "../../hooks/useData";
import type { BalanceSheet } from "../../types/data";
import { T } from "../../styles/tokens";
import "./BalanceSheetHealth.css";

/* Balance-sheet health (manual §06 KPI + §18 + §06 scenario sliders).
 *
 * PRIMARY indicator = COVENANT HEADROOM: Net debt / EBITDA vs the 4.0× covenant.
 * One ILLUSTRATIVE slider moves the annual EBITDA (net debt is fixed at the real
 * base £11.5m); the widget recomputes Net debt/EBITDA, the 4.0× covenant line
 * and the headroom / distance-to-breach live. This is a presentation-only
 * what-if computed in the frontend from real balance_sheet.json inputs — it does
 * NOT touch pipeline.py / chain.ts / any model number.
 *
 * EBITDA is not stored in balance_sheet.json, so it is DERIVED from the two real
 * figures: EBITDA = net_debt / (net_debt/EBITDA) = 11.5 / 3.7 ≈ £3.11m. */

const COVENANT = 4.0; // ND/EBITDA covenant threshold
const GMAX = 8.0; // gauge axis max (covers the slider's full ND/EBITDA range)
const EB_MIN = 1.5; // £m — slider bounds
const EB_MAX = 6.0;

export default function BalanceSheetHealth() {
  const { data, loading, error } = useFetch<BalanceSheet>("balance_sheet.json");
  // null = "at base"; eb resolves to the derived base until the user drags.
  const [ebitda, setEbitda] = useState<number | null>(null);

  if (loading) return <div className="chart-skeleton" style={{ height: 240 }} />;
  if (error || !data)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  // real base inputs
  const netDebt = data.net_debt_m; // fixed £11.5m
  const ebitdaBase = netDebt / data.net_debt_ebitda; // 11.5 / 3.7 ≈ 3.11
  const eb = ebitda ?? ebitdaBase;
  const atBase = ebitda === null || Math.abs(eb - ebitdaBase) < 1e-9;

  // live recompute
  const nd = netDebt / eb; // net debt / EBITDA
  const breach = nd > COVENANT;
  const headroomX = COVENANT - nd; // ×-reserve to the covenant (negative = breach)
  const ebitdaBreach = netDebt / COVENANT; // EBITDA at which ND/EBITDA = 4.0×
  const cushion = eb - ebitdaBreach; // £m EBITDA can fall before breach

  // gauge geometry (0..GMAX horizontal bar)
  const W = 420;
  const H = 80;
  const PAD = 28;
  const BAR_Y = 34;
  const BAR_H = 12;
  const trackW = W - 2 * PAD;
  const x = (v: number) => PAD + (Math.min(v, GMAX) / GMAX) * trackW;
  const ndX = x(nd);
  const covX = x(COVENANT);
  const ndLabelX = Math.min(Math.max(ndX, PAD + 12), W - PAD - 12);
  const ndColor = breach ? T.down : nd >= COVENANT - 0.5 ? T.warn : T.up;

  return (
    <div className="bsh">
      <div className="bsh-gauge-block">
        <div className="bsh-gauge-head">
          <span className="bsh-gauge-title mono">NET DEBT / EBITDA</span>
          {/* key on the value → the gold-tint flash replays on every change (§06) */}
          <span
            key={nd.toFixed(2)}
            className="bsh-gauge-value bsh-flash mono"
            style={{ color: ndColor }}
          >
            {nd.toFixed(1)}×
          </span>
          {breach ? (
            <span className="bsh-badge mono bsh-badge-warn">⚠ COVENANT BREACH</span>
          ) : (
            <span className="bsh-badge mono bsh-badge-ok">
              OK · {headroomX.toFixed(1)}× rezerva
            </span>
          )}
        </div>

        <svg className="bsh-gauge-svg" viewBox={`0 0 ${W} ${H}`}>
          <rect x={PAD} y={BAR_Y} width={trackW} height={BAR_H} fill={T.bg2} />
          <rect x={PAD} y={BAR_Y} width={ndX - PAD} height={BAR_H} fill={ndColor} />

          {/* current value — needle + label above */}
          <line x1={ndX} y1={BAR_Y - 6} x2={ndX} y2={BAR_Y + BAR_H + 6} stroke={ndColor} strokeWidth={2} />
          <text x={ndLabelX} y={BAR_Y - 11} className="bsh-tick bsh-tick-val mono" textAnchor="middle" fill={ndColor}>
            {nd.toFixed(1)}×
          </text>

          {/* covenant — dashed tick + label below */}
          <line x1={covX} y1={BAR_Y - 4} x2={covX} y2={BAR_Y + BAR_H + 4} stroke={T.down} strokeWidth={1.5} strokeDasharray="3 2" />
          <text x={covX} y={BAR_Y + BAR_H + 18} className="bsh-tick mono" textAnchor="middle" fill={T.down}>
            covenant {COVENANT.toFixed(1)}×
          </text>

          <text x={PAD} y={BAR_Y + BAR_H + 18} className="bsh-tick mono" textAnchor="middle">0×</text>
          <text x={W - PAD} y={BAR_Y + BAR_H + 18} className="bsh-tick mono" textAnchor="middle">{GMAX.toFixed(1)}×</text>
        </svg>

        {/* ── interactive EBITDA slider (illustrative what-if) ── */}
        <div className="bsh-sim">
          <div className="bsh-sim-head">
            <span className="bsh-sim-label mono">ROČNÁ EBITDA</span>
            <span className="bsh-sim-value mono">£{eb.toFixed(2)}m</span>
            {!atBase && (
              <button className="bsh-sim-reset mono" onClick={() => setEbitda(null)}>
                reset → £{ebitdaBase.toFixed(2)}m
              </button>
            )}
          </div>
          <input
            className="bsh-slider"
            type="range"
            min={EB_MIN}
            max={EB_MAX}
            step={0.05}
            value={eb}
            onChange={(e) => setEbitda(Number(e.target.value))}
            aria-label="Ročná EBITDA (ilustratívne)"
          />
          <div className="bsh-sim-scale mono">
            <span>£{EB_MIN.toFixed(1)}m</span>
            <span>£{EB_MAX.toFixed(1)}m</span>
          </div>

          {/* headroom / distance-to-breach readout */}
          <div className="bsh-sim-readout">
            <div className="bsh-ro">
              <span className="bsh-ro-label mono">REZERVA DO COVENANTU</span>
              <span
                className="bsh-ro-value mono"
                style={{ color: breach ? T.down : headroomX < 0.5 ? T.warn : T.up }}
              >
                {breach
                  ? `prekročené o ${Math.abs(headroomX).toFixed(1)}×`
                  : `${headroomX.toFixed(1)}×`}
              </span>
            </div>
            <div className="bsh-ro">
              <span className="bsh-ro-label mono">EBITDA DO PRELOMU</span>
              <span className="bsh-ro-value mono">
                £{ebitdaBreach.toFixed(2)}m{" "}
                <span className="bsh-ro-sub">
                  (vankúš £{cushion.toFixed(2)}m)
                </span>
              </span>
            </div>
          </div>

          <div className="bsh-sim-note mono">
            Ilustratívne, nie prognóza. Net debt fixný na £{netDebt}m; EBITDA nie
            je v dátach uložená — odvodené ako £{netDebt}m / {data.net_debt_ebitda}×
            = £{ebitdaBase.toFixed(2)}m. Prepočet beží v prehliadači, nemení model.
          </div>
        </div>
      </div>

      {/* secondary metrics (real data, unchanged) */}
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
