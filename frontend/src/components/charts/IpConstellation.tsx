import { useMemo, useState } from "react";
import { useFetch } from "../../hooks/useData";
import type { IPNetwork, IPNode } from "../../types/data";
import { T } from "../../styles/tokens";
import { areaToRegion } from "../../lib/ukRegions";
import { classifyIp, orBranch, IP_KIND_LABEL, type IpKind } from "../../lib/ipEntity";
import {
  HEX_POS,
  HEX_R,
  hexCenter,
  hexPath,
  hexViewBox,
} from "../../lib/ukHexGrid";
import "./IpConstellation.css";

/* IP market-structure map (manual §12/§13) — IP entities placed GEOGRAPHICALLY
 * by region inside the same stylised-UK hex zones used by the regional
 * cartogram. Size = case count, colour = region, shape = entity kind
 * (square = Official Receiver office, circle = individual IP).
 *
 * HONESTY (critical):
 *  - position is by REGION (from the IP postcode), jittered inside the region
 *    hex — we do NOT have precise lat/long and do not invent coordinates;
 *  - there are NO EDGES — no MANO-case linkage and no real firm↔firm relation
 *    exists in the data, so none is drawn. This is market STRUCTURE, not a MANO
 *    referral network;
 *  - OR branches are tagged as offices (not merged away — each is a real
 *    regional branch); individuals are tagged as people. No entity invented or
 *    dropped beyond the honest top-N cap.
 * From ip_network.json. */

const TOP_N = 140; // render the largest entities; the tail is single-digit noise

const REGION_COLORS: Record<string, string> = {
  "Londýn": T.gold,
  "Severozápad": T.signal,
  "Yorkshire": "#9B6DD6",
  "Východ": "#3DC97B",
  "West Midlands": "#E5884D",
  "Juhovýchod": "#4CB8E8",
  "East Midlands": "#D6B84C",
  "Juhozápad": "#5BC9A8",
  "Severovýchod": "#C0708A",
  "Škótsko": "#7AA6D6",
  "Wales": "#C9A23D",
  "Severné Írsko": "#A88AD6",
  "Ostatné": T.text2,
};

const SHORT: Record<string, string> = {
  "Škótsko": "ŠKÓT", "Severné Írsko": "S.ÍR", "Severovýchod": "SV",
  "Severozápad": "SZ", "Yorkshire": "YORK", "Wales": "WAL",
  "West Midlands": "W.MID", "East Midlands": "E.MID", "Východ": "VÝCH",
  "Juhozápad": "JZ", "Juhovýchod": "JV", "Londýn": "LDN",
};

// deterministic [0,1) hash from a string, so jitter is stable across renders
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // two independent-ish draws fold the high/low bits
  return ((h >>> 0) % 100000) / 100000;
}

interface Placed {
  node: IPNode;
  region: string;
  kind: IpKind;
  x: number;
  y: number;
  r: number;
  color: string;
  label: boolean;
  // hex geometry — entity labels anchor at the bottom of the region hex (not at
  // the jittered node) so a region's label stays centred in its own zone, never
  // drifts into a neighbour, and never collides with the top zone short-label.
  hexCx: number;
  hexBotY: number;
  hexCol: number; // for staggering same-row neighbour labels vertically
}

export default function IpConstellation() {
  const { data, loading, error } = useFetch<IPNetwork>("ip_network.json");
  const [hover, setHover] = useState<Placed | null>(null);

  const placed = useMemo<Placed[]>(() => {
    if (!data) return [];
    const sorted = [...data.nodes].sort((a, b) => b.total_cases - a.total_cases);
    const shown = sorted.slice(0, TOP_N);
    const maxCases = shown[0]?.total_cases ?? 1;
    // small marker radii so a whole region's nodes stay inside its hex
    const sizeFor = (c: number) => 3 + Math.sqrt(c / maxCases) * 13;

    // Label only the single LARGEST entity per region (at most one label per
    // hex → no intra-hex label collisions), and only if it's a top-8 entity
    // overall (so sparse regions don't get a label for a tiny node).
    const labelFloor = shown[7]?.total_cases ?? -Infinity;
    const biggestInRegion = new Map<string, string>(); // region -> node id
    for (const n of shown) {
      const reg = areaToRegion(n.primary_region);
      if (!biggestInRegion.has(reg)) biggestInRegion.set(reg, n.id); // shown is sorted desc
    }

    return shown.map((n): Placed => {
      const region = areaToRegion(n.primary_region);
      const pos = HEX_POS[region] ?? HEX_POS["Londýn"];
      const [cx, cy] = hexCenter(pos.col, pos.row);
      const r = sizeFor(n.total_cases);
      // jitter inside the region hex: polar offset, deterministic from the
      // entity id (stable across renders). Keep the marker fully inside the hex
      // by capping the offset at the inradius minus the marker radius.
      const inradius = HEX_R * 0.866; // pointy-top hex inradius = R·√3/2
      const maxOff = Math.max(0, inradius - r - 2);
      const ang = hash01(n.id + "a") * Math.PI * 2;
      const rad = Math.sqrt(hash01(n.id + "r")) * maxOff;
      return {
        node: n,
        region,
        kind: classifyIp(n.full_name),
        x: cx + Math.cos(ang) * rad,
        y: cy + Math.sin(ang) * rad,
        r,
        color: REGION_COLORS[region] ?? T.text2,
        label:
          biggestInRegion.get(region) === n.id && n.total_cases >= labelFloor,
        hexCx: cx,
        hexBotY: cy + HEX_R,
        hexCol: pos.col,
      };
    });
  }, [data]);

  if (loading) return <div className="chart-skeleton" style={{ height: 460 }} />;
  if (error || !data || data.nodes.length === 0)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const { w: VB_W, h: VB_H } = hexViewBox();
  // which region zones actually have at least one placed entity
  const usedRegions = new Set(placed.map((p) => p.region));

  const shortName = (p: Placed) =>
    p.kind === "or" ? `OR ${orBranch(p.node.full_name)}` : p.node.full_name;

  return (
    <div className="ipc">
      <div className="ipc-stage">
        <svg
          className="ipc-svg"
          viewBox={`0 0 ${VB_W.toFixed(0)} ${VB_H.toFixed(0)}`}
          role="img"
          aria-label="IP firmy podľa regiónu v štylizovanej UK mape"
        >
          {/* region zones — faint hex outlines + short label, context only */}
          {Object.entries(HEX_POS).map(([region, pos]) => {
            const [cx, cy] = hexCenter(pos.col, pos.row);
            const on = usedRegions.has(region);
            return (
              <g key={region} className="ipc-zone">
                <path
                  d={hexPath(cx, cy)}
                  fill={on ? T.bg2 : "transparent"}
                  fillOpacity={0.35}
                  stroke={T.border}
                  strokeWidth={1}
                />
                <text
                  x={cx}
                  y={cy - HEX_R + 12}
                  textAnchor="middle"
                  className="ipc-zone-label mono"
                >
                  {SHORT[region]}
                </text>
              </g>
            );
          })}

          {/* entity markers — squares = OR offices, circles = individuals */}
          {placed.map((p) => {
            const active = hover?.node.id === p.node.id;
            const common = {
              fill: p.color,
              fillOpacity: 0.85,
              stroke: active ? T.goldBright : T.bg1,
              strokeWidth: active ? 2 : 1,
            };
            return (
              <g
                key={p.node.id}
                className="ipc-node"
                onMouseEnter={() => setHover(p)}
                onMouseLeave={() => setHover(null)}
              >
                {p.kind === "or" ? (
                  <rect
                    x={p.x - p.r}
                    y={p.y - p.r}
                    width={p.r * 2}
                    height={p.r * 2}
                    {...common}
                  />
                ) : (
                  <circle cx={p.x} cy={p.y} r={p.r} {...common} />
                )}
              </g>
            );
          })}

          {/* one label per region (largest entity), anchored near the BOTTOM of
              the region hex so labels stay centred in their own zone, don't
              drift into neighbours, and don't collide with the top zone
              short-label. Drawn last so they sit on top. */}
          {placed
            .filter((p) => p.label)
            .map((p) => (
              <text
                key={`l-${p.node.id}`}
                x={p.hexCx}
                // stagger odd columns down a line so two labelled hexes in the
                // same row can't share a baseline and overlap at their edge
                y={p.hexBotY - 5 + (p.hexCol % 2 === 1 ? 11 : 0)}
                textAnchor="middle"
                className="ipc-node-label mono"
              >
                {shortName(p).slice(0, 16)}
              </text>
            ))}
        </svg>

        {hover && (
          <div className="ipc-tip mono">
            <div className="ipc-tip-name">{shortName(hover)}</div>
            <div className="ipc-tip-kind">{IP_KIND_LABEL[hover.kind]}</div>
            <div className="ipc-tip-row">
              <span>{hover.node.total_cases.toLocaleString("en-GB")} prípadov</span>
              <span className="ipc-tip-region">{hover.region}</span>
            </div>
            <div className="ipc-tip-sub">
              sweet-spot 2016–19: {hover.node.sweet_spot_cases} ({hover.node.pct_sweet_spot}%)
            </div>
          </div>
        )}
      </div>

      {/* shape legend */}
      <div className="ipc-legend mono">
        <span className="ipc-legend-item">
          <span className="ipc-legend-circle" /> jednotlivec (IP)
        </span>
        <span className="ipc-legend-item">
          <span className="ipc-legend-square" /> úrad (Official Receiver)
        </span>
        <span className="ipc-legend-item ipc-legend-size">veľkosť = počet prípadov</span>
      </div>

      <div className="chart-footnote">
        Pozícia podľa <b>regiónu</b> (PSČ), nie presnej adresy · <b>bez hrán</b> ·
        trhová štruktúra, nie MANO referral sieť. Tvar = typ entity (kruh =
        jednotlivec, štvorec = úrad OR), farba = región, veľkosť = počet
        prípadov. Official Receiver = vládny úrad, nie boutique IP — značíme ho
        zvlášť. Zobrazených top {TOP_N} z{" "}
        {data.nodes.length.toLocaleString("en-GB")} entít (chvost = jednotky
        prípadov). Najväčší: OR Nottingham (1 108). Zdroj: Gazette appointments
        agregované na IP entitu.
      </div>
    </div>
  );
}
