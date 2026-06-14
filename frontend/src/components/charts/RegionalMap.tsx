import { useRef, useState } from "react";
import { useFetch } from "../../hooks/useData";
import type { Regional } from "../../types/data";
import { UK_GEO } from "../../lib/ukGeo";
import "./RegionalMap.css";

interface HoverState {
  name: string;
  count: number;
  x: number;
  y: number;
}

/* Regionálne rozloženie firiem — REAL UK ITL1/NUTS1 boundaries (not the rejected
 * hex cartogram). Each region is shaded by its real firm count on a flat
 * dashboard gold ramp (low→high). Full-word Slovak labels sit in the side
 * gutters with a thin leader line to the region centroid — so even small
 * regions (Londýn) get a full, un-truncated label that never overlaps.
 *
 * HONESTY:
 *  - geometry is real boundaries (Eurostat GISCO NUTS1 2021, bundled offline);
 *  - counts are real (regional.json ← CH enrichment · PSČ → región);
 *  - regional.json has NO YoY, so none is shown — not invented. */

const GUTTER = 320; // viewBox units reserved each side for gutter labels
const MAP_W = UK_GEO.width;
const TOTAL_W = MAP_W + 2 * GUTTER;
const H = UK_GEO.height;

// flat gold ramp, low→high (no gradient) — DESIGN-MANUAL heat scale
function shadeFor(t: number): string {
  if (t > 0.66) return "#F5C400"; // --gold
  if (t > 0.4) return "#A8901F";
  if (t > 0.2) return "#6E5E22";
  if (t > 0.07) return "#3E3717";
  return "#23200F";
}

interface Slot {
  name: string;
  count: number;
  labelX: number;
  labelY: number;
  anchor: "start" | "end";
  cx: number; // centroid (map-space, gutter-offset applied)
  cy: number;
}

export default function RegionalMap() {
  const { data, loading, error } = useFetch<Regional>("regional.json");
  const stageRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

  if (loading) return <div className="chart-skeleton" style={{ height: 460 }} />;
  if (error || !data || data.regions.length === 0)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const countByName = new Map(data.regions.map((r) => [r.region, r.count]));
  const max = Math.max(...data.regions.map((r) => r.count));
  const total = data.regions.reduce((a, r) => a + r.count, 0);

  // gutter assignment: smaller centroid-x → left gutter, larger → right
  const withCounts = UK_GEO.regions.map((r) => ({
    ...r,
    count: countByName.get(r.name) ?? 0,
  }));
  const byX = [...withCounts].sort((a, b) => a.cx - b.cx);
  const half = Math.ceil(byX.length / 2);
  const leftNames = new Set(byX.slice(0, half).map((r) => r.name));

  const layoutGutter = (
    items: typeof withCounts,
    labelX: number,
    anchor: "start" | "end",
  ): Slot[] => {
    const arr = [...items].sort((a, b) => a.cy - b.cy);
    const top = 70;
    const bottom = H - 70;
    const n = arr.length;
    return arr.map((r, i) => ({
      name: r.name,
      count: r.count,
      labelX,
      labelY: n === 1 ? (top + bottom) / 2 : top + (i * (bottom - top)) / (n - 1),
      anchor,
      cx: r.cx + GUTTER,
      cy: r.cy,
    }));
  };

  const slots = [
    ...layoutGutter(
      withCounts.filter((r) => leftNames.has(r.name)),
      GUTTER - 28,
      "end",
    ),
    ...layoutGutter(
      withCounts.filter((r) => !leftNames.has(r.name)),
      GUTTER + MAP_W + 28,
      "start",
    ),
  ];

  // tooltip position: offset from cursor, clamped inside the stage
  const moveHover = (e: React.MouseEvent, name: string, count: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(e.clientX - rect.left + 14, rect.width - 150);
    const y = Math.min(e.clientY - rect.top + 14, rect.height - 48);
    setHover({ name, count, x: Math.max(0, x), y: Math.max(0, y) });
  };

  return (
    <div className="rmap">
      <div className="rmap-stage" ref={stageRef}>
        <svg
          className="rmap-svg"
          viewBox={`0 0 ${TOTAL_W} ${H}`}
          role="img"
          aria-label="UK ITL1 mapa firiem podľa regiónu"
        >
          {/* region polygons — flat fill by count, thin sharp strokes */}
          {UK_GEO.regions.map((r) => {
            const count = countByName.get(r.name) ?? 0;
            return (
              <path
                key={r.name}
                className="rmap-region"
                d={r.path}
                transform={`translate(${GUTTER} 0)`}
                fill={shadeFor(count / max)}
                stroke="#14140F"
                strokeWidth={3}
                strokeLinejoin="miter"
                onMouseMove={(e) => moveHover(e, r.name, count)}
                onMouseLeave={() => setHover(null)}
              >
                <title>
                  {r.name}: {count.toLocaleString("en-GB")} firiem (
                  {((count / total) * 100).toFixed(1)} %)
                </title>
              </path>
            );
          })}

        {/* leader lines + gutter labels (full words, never truncated) */}
        {slots.map((s) => (
          <g key={s.name} className="rmap-label">
            <line
              x1={s.anchor === "end" ? s.labelX + 6 : s.labelX - 6}
              y1={s.labelY}
              x2={s.cx}
              y2={s.cy}
              stroke="#45452F"
              strokeWidth={2}
            />
            <circle cx={s.cx} cy={s.cy} r={4} fill="#EDEBDF" />
            <text
              x={s.labelX}
              y={s.labelY - 4}
              textAnchor={s.anchor}
              className="rmap-name"
            >
              {s.name}
            </text>
            <text
              x={s.labelX}
              y={s.labelY + 30}
              textAnchor={s.anchor}
              className="rmap-count mono"
            >
              {s.count.toLocaleString("en-GB")}
            </text>
          </g>
        ))}
        </svg>

        {/* styled hover tooltip — DESIGN-MANUAL §07/§12: bg-2, 1px border-strong,
            mono numbers. Region name + the value the choropleth encodes (real
            firm count + share). regional.json has no YoY, so none is shown. */}
        {hover && (
          <div className="rmap-tip" style={{ left: hover.x, top: hover.y }}>
            <div className="rmap-tip-name">{hover.name}</div>
            <div className="rmap-tip-row mono">
              <span>{hover.count.toLocaleString("en-GB")} firiem</span>
              <span className="rmap-tip-share">
                {((hover.count / total) * 100).toFixed(1)} %
              </span>
            </div>
          </div>
        )}
      </div>

      {/* heat legend */}
      <div className="rmap-legend mono">
        <span className="rmap-legend-label">NÍZKO</span>
        {["#23200F", "#3E3717", "#6E5E22", "#A8901F", "#F5C400"].map((c) => (
          <span key={c} className="rmap-swatch" style={{ background: c }} />
        ))}
        <span className="rmap-legend-label">
          VYSOKO ({max.toLocaleString("en-GB")})
        </span>
      </div>

      <div className="chart-footnote">
        Reálne hranice ITL1/NUTS1 regiónov (Eurostat GISCO 2021, zabalené
        offline), odtieň = počet firiem (flat zlatá škála, nízko→vysoko). Plné
        slovenské názvy v okrajoch s vodiacou čiarou do centroidu regiónu.
        Pokrytie {data.coverage_pct} % ({data.mapped_firms.toLocaleString("en-GB")}{" "}
        / {data.total_firms.toLocaleString("en-GB")}), zdroj: CH enrichment ·
        PSČ. regional.json nemá YoY, tak ho neuvádzame.
      </div>
    </div>
  );
}
