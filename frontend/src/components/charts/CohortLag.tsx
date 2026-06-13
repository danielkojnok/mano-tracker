import { useFetch } from "../../hooks/useData";
import type { ChainConstants } from "../../types/data";
import { chainRevenue } from "../../lib/chain";
import { T } from "../../styles/tokens";
import "./CohortLag.css";

/* Cohort / lag visual (manual §14 cohort waterfall) — makes the ~25-month lag
 * tangible. ONE year's insolvency cohort is run through the SAME chain
 * (lib/chain.ts, mirroring pipeline.py) and laid out on a month axis: the
 * cohort is signed at month 0, cases complete at the case-lag (~13m), and cash
 * (= revenue) arrives at the full lag (~25m). All inputs from
 * chain_constants.json; the chain is the single source. */

const fmtInt = (n: number) => Math.round(n).toLocaleString("en-GB");

export default function CohortLag() {
  const { data, loading, error } = useFetch<ChainConstants>("chain_constants.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 220 }} />;
  if (error || !data)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const chain = chainRevenue({
    insolvencies: data.insolvencies_12m,
    referralRate: data.referral_rate,
    acceptanceRate: data.acceptance_rate,
    compulsoryWeight: data.compulsory_weight,
    arrcc: data.arrcc.base,
    capacityCap: data.capacity_cap,
  });

  const caseLag = 13; // pipeline.py CASE_LAG_MONTHS
  const cashLag = data.lag_months; // total 25m

  // Geometry
  const VB_W = 920;
  const VB_H = 220;
  const PAD_L = 24;
  const PAD_R = 24;
  const AXIS_Y = 168;
  const trackW = VB_W - PAD_L - PAD_R;
  const monthX = (m: number) => PAD_L + (m / cashLag) * trackW;

  const stops = [
    {
      m: 0,
      title: "KOHORTA INSOLVENCIÍ",
      value: `${fmtInt(chain.weighted_market)}`,
      unit: "vážený trh",
      color: T.signal,
    },
    {
      m: 0,
      title: "INVESTÍCIE PODPÍSANÉ",
      value: `${fmtInt(chain.completions_capped)}`,
      unit: `prípadov (cap ${fmtInt(chain.capacity_cap)})`,
      color: T.signal,
      offsetY: 1,
    },
    {
      m: caseLag,
      title: "UKONČENIA",
      value: `${fmtInt(chain.completions_capped)}`,
      unit: `${caseLag}m: case lag`,
      color: T.signal,
    },
    {
      m: cashLag,
      title: "CASH = TRŽBA",
      value: `£${chain.revenue_capped_m}m`,
      unit: `${cashLag}m: + cash lag`,
      color: T.gold,
    },
  ];

  return (
    <div>
      <svg
        className="cohort-svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Cohort lag — 25 mesiacov od insolvencie po tržbu"
      >
        {/* baseline track */}
        <line x1={PAD_L} y1={AXIS_Y} x2={VB_W - PAD_R} y2={AXIS_Y} stroke={T.border} strokeWidth={1} />

        {/* month ticks every ~5 months */}
        {[0, 5, 10, 13, 20, cashLag].map((m) => (
          <g key={`tick-${m}`}>
            <line x1={monthX(m)} y1={AXIS_Y} x2={monthX(m)} y2={AXIS_Y + 5} stroke={T.border} strokeWidth={1} />
            <text x={monthX(m)} y={AXIS_Y + 18} className="cohort-tick mono" textAnchor="middle">
              {m}m
            </text>
          </g>
        ))}

        {/* flow segment: signed (cyan) → cash (gold) */}
        <line
          x1={monthX(0)}
          y1={AXIS_Y - 28}
          x2={monthX(caseLag)}
          y2={AXIS_Y - 28}
          stroke={T.signal}
          strokeWidth={4}
        />
        <line
          x1={monthX(caseLag)}
          y1={AXIS_Y - 28}
          x2={monthX(cashLag)}
          y2={AXIS_Y - 28}
          stroke={T.gold}
          strokeWidth={4}
          strokeDasharray="2 3"
        />

        {/* stop markers + labels */}
        {stops.map((s, i) => {
          const x = monthX(s.m);
          const baseY = AXIS_Y - 28;
          const labelY = 26 + (s.offsetY ? 56 : 0);
          return (
            <g key={`stop-${i}`}>
              <line x1={x} y1={labelY + 44} x2={x} y2={baseY} stroke={T.border} strokeWidth={1} strokeDasharray="2 3" />
              <rect x={x - 5} y={baseY - 5} width={10} height={10} fill={s.color} />
              <text x={x} y={labelY} className="cohort-stop-title" textAnchor={i === 0 ? "start" : "middle"}>
                {s.title}
              </text>
              <text
                x={x}
                y={labelY + 22}
                className="cohort-stop-value mono"
                textAnchor={i === 0 ? "start" : "middle"}
                fill={s.color}
              >
                {s.value}
              </text>
              <text x={x} y={labelY + 38} className="cohort-stop-unit mono" textAnchor={i === 0 ? "start" : "middle"}>
                {s.unit}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="cohort-note mono">
        Jedna kohorta insolvencií sa premieta do tržieb až o <b className="gold">{cashLag} mesiacov</b>{" "}
        neskôr — preto insolvenčný trh vedie tržby MANO. Modrá = case lag (
        {caseLag}m, investícia → ukončenie), zlatá čiarkovaná = cash lag (
        {cashLag - caseLag}m, ukončenie → inkaso).
      </div>
    </div>
  );
}
