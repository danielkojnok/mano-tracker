import { useFetch } from "../../hooks/useData";
import type { ThesisFlow } from "../../types/data";
import { T } from "../../styles/tokens";
import "./ThesisFunnel.css";

/* Hand-built SVG funnel (manual §14) — replaces ECharts sankey whose
 * auto-placed labels collided. Full control: alternating above/below
 * labels, sqrt-scaled bar heights, conversion-rate annotations. */

const fmt = (n: number) =>
  n >= 1000 ? n.toLocaleString("en-GB") : n.toFixed(n % 1 === 0 ? 0 : 1);

// SVG geometry
const VB_W = 960;
const VB_H = 280;
const BAR_W = 28;
const MAX_BAR_H = 150;
const MID_Y = VB_H / 2;

export default function ThesisFunnel() {
  const { data, loading, error } = useFetch<ThesisFlow>("thesis_flow.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 320 }} />;
  if (error || !data)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const stages = data.stages;
  const n = stages.length;
  const maxVal = Math.max(...stages.map((s) => s.value));

  // sqrt scale so the 27k → 38 collapse stays legible
  const barH = (v: number) => Math.max(8, (Math.sqrt(v) / Math.sqrt(maxVal)) * MAX_BAR_H);

  // lay stages out left → right, evenly spaced
  const step = (VB_W - BAR_W) / (n - 1);

  const bars = stages.map((s, i) => {
    const x = i * step;
    const h = barH(s.value);
    return { x, h, top: MID_Y - h / 2, bottom: MID_Y + h / 2, stage: s, i };
  });

  const isFinal = (i: number) => i === n - 1;

  return (
    <div>
      <svg
        className="funnel-svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Konverzný lievik tézy"
      >
        {/* connecting trapezoids between consecutive bars */}
        {bars.slice(0, -1).map((b, i) => {
          const next = bars[i + 1];
          const x1 = b.x + BAR_W;
          const x2 = next.x;
          const finalFlow = isFinal(i + 1);
          const pts = `${x1},${b.top} ${x2},${next.top} ${x2},${next.bottom} ${x1},${b.bottom}`;
          // conversion rate label centered on connector
          const rate = (next.stage.value / b.stage.value) * 100;
          const rateStr =
            rate >= 10 ? `${rate.toFixed(0)}%` : `${rate.toFixed(2)}%`;
          return (
            <g key={`conn-${i}`}>
              <polygon
                points={pts}
                fill={finalFlow ? T.gold : T.signal}
                fillOpacity={0.3}
              />
              <text
                x={(x1 + x2) / 2}
                y={MID_Y - 4}
                className="funnel-rate mono"
                textAnchor="middle"
              >
                {rateStr}
              </text>
            </g>
          );
        })}

        {/* stage bars + alternating labels */}
        {bars.map((b) => {
          const above = b.i % 2 === 0; // stage label above on even, below on odd
          const final = isFinal(b.i);
          const labelY = above ? b.top - 28 : b.bottom + 22;
          const valueY = above ? b.bottom + 22 : b.top - 12;
          return (
            <g key={`bar-${b.i}`}>
              <rect
                x={b.x}
                y={b.top}
                width={BAR_W}
                height={b.h}
                fill={final ? T.gold : T.signal}
              />
              <text
                x={b.x + BAR_W / 2}
                y={labelY}
                className="funnel-stage"
                textAnchor="middle"
              >
                {b.stage.name}
              </text>
              <text
                x={b.x + BAR_W / 2}
                y={valueY}
                className="funnel-value mono"
                textAnchor="middle"
                fill={final ? T.gold : T.signal}
              >
                {fmt(b.stage.value)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="funnel-explainer">
        Model premieta UK insolvenčný trh cez konverzné stupne na MANO tržby.
        Cyan stupne = trh; zlatý finálny stupeň = tržba modelu pri plnej
        kapacite (bez capacity cap).
      </div>

      <table className="funnel-numbers mono">
        <tbody>
          <tr>
            <td className="fn-label">Model bez capacity cap</td>
            <td className="fn-value">£38.1m</td>
            <td className="fn-desc">matematický strop</td>
          </tr>
          <tr>
            <td className="fn-label">Model s capacity cap</td>
            <td className="fn-value">£33.8m</td>
            <td className="fn-desc">base scenár (291 prípadov)</td>
          </tr>
          <tr className="fn-actual">
            <td className="fn-label">FY26 realised actual</td>
            <td className="fn-value">£28.0m</td>
            <td className="fn-desc">MANO RNS apríl 2026</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
