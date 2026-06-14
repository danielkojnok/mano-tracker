import { useState } from "react";
import { useFetch } from "../../hooks/useData";
import type { Regional, RegionCount } from "../../types/data";
import { T } from "../../styles/tokens";
import { HEX_POS, hexCenter, hexPath, hexViewBox } from "../../lib/ukHexGrid";
import "./RegionalHexMap.css";

/* UK hex-cartogram of insolvency-firm counts by ITL1 region (manual §12 +
 * heat scale §07). Each of the ~12 regions present in regional.json is a
 * hexagon at a FIXED grid position chosen to read as the UK shape (Scotland
 * top, NI left, London bottom-right). Shade = count on the bg-2→gold-dim→gold
 * ramp. Label = region + count.
 *
 * HONESTY:
 *  - only regions that exist in the data are drawn — no invented sub-regions;
 *  - hardcoded hex positions are a deliberate cartogram (the manual calls for
 *    an abstract vector UK map, not satellite geography), not fabricated data;
 *  - regional.json has NO YoY field, so the tooltip shows count + share only —
 *    we do not invent a YoY number.
 *  Coverage caption comes straight from the data (mapped / total). */

// Hex grid (positions + geometry) is shared with the IP map via lib/ukHexGrid.

// short label inside each hex (full name kept in the legend row + tooltip)
const SHORT: Record<string, string> = {
  "Škótsko": "ŠKÓT",
  "Severné Írsko": "S.ÍR",
  "Severovýchod": "SV",
  "Severozápad": "SZ",
  "Yorkshire": "YORK",
  "Wales": "WAL",
  "West Midlands": "W.MID",
  "East Midlands": "E.MID",
  "Východ": "VÝCH",
  "Juhozápad": "JZ",
  "Juhovýchod": "JV",
  "Londýn": "LDN",
};

// bg-2 → gold-dim → gold ramp by share of max (manual heat scale)
function shadeFor(t: number): string {
  if (t > 0.66) return T.gold;
  if (t > 0.33) return T.goldDim;
  if (t > 0.12) return "#5A4E20"; // dim gold-brown, still above panel bg
  return T.bg2;
}
// readable text colour on top of the hex fill
function textOn(t: number): string {
  return t > 0.33 ? "#0B0B09" : T.text;
}

export default function RegionalHexMap() {
  const { data, loading, error } = useFetch<Regional>("regional.json");
  const [hover, setHover] = useState<RegionCount | null>(null);

  if (loading) return <div className="chart-skeleton" style={{ height: 360 }} />;
  if (error || !data || data.regions.length === 0)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const counts = data.regions;
  const total = counts.reduce((a, r) => a + r.count, 0);
  const max = Math.max(...counts.map((r) => r.count));

  // viewBox extent from the shared grid
  const { w: VB_W, h: VB_H } = hexViewBox();

  // draw only regions present in the data that we have a position for
  const drawn = counts.filter((r) => HEX_POS[r.region]);

  return (
    <div className="rhx">
      <div className="rhx-stage">
        <svg
          className="rhx-svg"
          viewBox={`0 0 ${VB_W.toFixed(0)} ${VB_H.toFixed(0)}`}
          role="img"
          aria-label="UK hex kartogram insolvencií podľa regiónu"
        >
          {drawn.map((r) => {
            const { col, row } = HEX_POS[r.region];
            const [cx, cy] = hexCenter(col, row);
            const t = r.count / max;
            const fill = shadeFor(t);
            const tcol = textOn(t);
            const active = hover?.region === r.region;
            return (
              <g
                key={r.region}
                className="rhx-hex"
                onMouseEnter={() => setHover(r)}
                onMouseLeave={() => setHover(null)}
              >
                <path
                  d={hexPath(cx, cy)}
                  fill={fill}
                  stroke={active ? T.goldBright : T.bg1}
                  strokeWidth={active ? 2 : 1.5}
                />
                <text x={cx} y={cy - 3} textAnchor="middle" className="rhx-hex-name mono" fill={tcol}>
                  {SHORT[r.region]}
                </text>
                <text x={cx} y={cy + 13} textAnchor="middle" className="rhx-hex-count mono" fill={tcol}>
                  {r.count.toLocaleString("en-GB")}
                </text>
              </g>
            );
          })}
        </svg>

        {/* tooltip — region + count + share (no YoY: not in the data) */}
        {hover && (
          <div className="rhx-tip mono">
            <div className="rhx-tip-name">{hover.region}</div>
            <div className="rhx-tip-row">
              <span>{hover.count.toLocaleString("en-GB")} firiem</span>
              <span className="rhx-tip-share">{((hover.count / total) * 100).toFixed(1)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* heat legend */}
      <div className="rhx-legend mono">
        <span className="rhx-legend-label">NÍZKO</span>
        <span className="rhx-legend-swatch" style={{ background: T.bg2 }} />
        <span className="rhx-legend-swatch" style={{ background: "#5A4E20" }} />
        <span className="rhx-legend-swatch" style={{ background: T.goldDim }} />
        <span className="rhx-legend-swatch" style={{ background: T.gold }} />
        <span className="rhx-legend-label">VYSOKO ({max.toLocaleString("en-GB")})</span>
      </div>

      <div className="chart-footnote">
        Hex = ITL1 región, odtieň = počet firiem (čierna→zlatá). Kartogram, nie
        geografická mapa — pozície sú štylizované do tvaru UK. Pokrytie{" "}
        {data.coverage_pct}% ({data.mapped_firms.toLocaleString("en-GB")} z{" "}
        {data.total_firms.toLocaleString("en-GB")}). regional.json nemá YoY, tak
        ho neuvádzame. Zdroj: Companies House enrichment · PSČ.
      </div>
    </div>
  );
}
