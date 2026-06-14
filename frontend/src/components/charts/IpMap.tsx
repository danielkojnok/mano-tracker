import { useMemo, useState } from "react";
import { useFetch } from "../../hooks/useData";
import type { IPNetwork, IPNode } from "../../types/data";
import { areaToRegion, REGION_ORDER } from "../../lib/ukRegions";
import { classifyIp, type IpKind } from "../../lib/ipEntity";
import { UK_GEO, REGION_COLORS, hash01 } from "../../lib/ukGeo";
import "./IpMap.css";

/* Trhová štruktúra IP — entities placed on the SAME real UK base as the regional
 * map (PART 6/7 share lib/ukGeo). Map on the LEFT, controls on the RIGHT.
 *
 * HONESTY (critical):
 *  - position is by REGION ONLY (from the IP postcode area), with deterministic
 *    jitter inside the region — we have NO precise coordinates and invent none;
 *  - entities whose postcode area is outside the region crosswalk go to a
 *    clearly separated "Ostatné" box, NOT a made-up UK location;
 *  - there are NO EDGES — this is market structure, not a MANO referral network;
 *  - shape = kind (circle = individual, square = OR office), colour = region,
 *    size = case count. From ip_network.json. */

const GUTTER = 320;
const MAP_W = UK_GEO.width;
const TOTAL_W = MAP_W + 2 * GUTTER;
const H = UK_GEO.height;
const TOP_N = 140; // renderable set; the tail is single-digit noise

// region anchors (centroid + jitter radius) in gutter-offset map space, plus a
// synthetic off-map box for "Ostatné" (no real geography → shown separately).
const ANCHORS: Record<string, { cx: number; cy: number; r: number }> = {};
for (const r of UK_GEO.regions) {
  ANCHORS[r.name] = { cx: r.cx + GUTTER, cy: r.cy, r: r.radius };
}
const OSTATNE_BOX = { cx: GUTTER + 150, cy: H - 150, r: 120 };
ANCHORS["Ostatné"] = OSTATNE_BOX;

interface Placed {
  node: IPNode;
  region: string;
  kind: IpKind;
  x: number;
  y: number;
  r: number;
  color: string;
}

export default function IpMap() {
  const { data, loading, error } = useFetch<IPNetwork>("ip_network.json");

  // ── controls (client-side React state only — no localStorage) ──
  const [showOR, setShowOR] = useState(true);
  const [showInd, setShowInd] = useState(true);
  const [regions, setRegions] = useState<Set<string>>(new Set()); // empty = all
  const [minCases, setMinCases] = useState(0);
  const [query, setQuery] = useState("");

  // base renderable set (top-N by cases), placed deterministically — computed
  // once per data load, independent of the live filters.
  const base = useMemo<Placed[]>(() => {
    if (!data) return [];
    const sorted = [...data.nodes].sort((a, b) => b.total_cases - a.total_cases);
    const shown = sorted.slice(0, TOP_N);
    const maxCases = shown[0]?.total_cases ?? 1;
    const sizeFor = (c: number) => 8 + Math.sqrt(c / maxCases) * 38;
    return shown.map((n): Placed => {
      const region = areaToRegion(n.primary_region);
      const a = ANCHORS[region] ?? ANCHORS["Ostatné"];
      const r = sizeFor(n.total_cases);
      const maxOff = Math.max(0, a.r - r - 4);
      const ang = hash01(n.id + "a") * Math.PI * 2;
      const rad = Math.sqrt(hash01(n.id + "r")) * maxOff;
      return {
        node: n,
        region,
        kind: classifyIp(n.full_name),
        x: a.cx + Math.cos(ang) * rad,
        y: a.cy + Math.sin(ang) * rad,
        r,
        color: REGION_COLORS[region] ?? REGION_COLORS["Ostatné"],
      };
    });
  }, [data]);

  const maxCases = base[0]?.node.total_cases ?? 1;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return base.filter((p) => {
      if (p.kind === "or" && !showOR) return false;
      if (p.kind === "individual" && !showInd) return false;
      if (regions.size > 0 && !regions.has(p.region)) return false;
      if (p.node.total_cases < minCases) return false;
      if (q && !p.node.full_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [base, showOR, showInd, regions, minCases, query]);

  if (loading) return <div className="chart-skeleton" style={{ height: 520 }} />;
  if (error || !data || data.nodes.length === 0)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  // gutter labels (full Slovak words + leader) for the regions actually present
  const present = new Set(base.map((p) => p.region));
  const labelRegions = REGION_ORDER.filter(
    (name) => present.has(name) && ANCHORS[name],
  );
  const byX = labelRegions
    .map((name) => ({ name, ...ANCHORS[name] }))
    .sort((a, b) => a.cx - b.cx);
  const half = Math.ceil(byX.length / 2);
  const leftNames = new Set(byX.slice(0, half).map((r) => r.name));
  const layout = (names: string[], labelX: number, anchor: "start" | "end") => {
    const arr = names
      .map((name) => ({ name, ...ANCHORS[name] }))
      .sort((a, b) => a.cy - b.cy);
    const top = 70;
    const bottom = H - 70;
    const n = arr.length;
    return arr.map((r, i) => ({
      name: r.name,
      labelX,
      labelY: n === 1 ? (top + bottom) / 2 : top + (i * (bottom - top)) / (n - 1),
      anchor,
      cx: r.cx,
      cy: r.cy,
    }));
  };
  const slots = [
    ...layout(
      labelRegions.filter((n) => leftNames.has(n)),
      GUTTER - 28,
      "end",
    ),
    ...layout(
      labelRegions.filter((n) => !leftNames.has(n)),
      GUTTER + MAP_W + 28,
      "start",
    ),
  ];

  const toggleRegion = (name: string) =>
    setRegions((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <div className="ipm">
      <div className="ipm-main">
        {/* ── MAP (left) ── */}
        <div className="ipm-mapcol">
          <svg
            className="ipm-svg"
            viewBox={`0 0 ${TOTAL_W} ${H}`}
            role="img"
            aria-label="IP entity podľa regiónu na reálnej UK mape"
          >
            {/* region outlines — faint context */}
            {UK_GEO.regions.map((r) => (
              <path
                key={r.name}
                d={r.path}
                transform={`translate(${GUTTER} 0)`}
                fill="#1C1C14"
                fillOpacity={0.55}
                stroke="#2A2A1F"
                strokeWidth={3}
                strokeLinejoin="miter"
              />
            ))}

            {/* Ostatné box — entities with a postcode area outside the crosswalk,
                kept clearly off the real geography */}
            <rect
              x={OSTATNE_BOX.cx - OSTATNE_BOX.r}
              y={OSTATNE_BOX.cy - OSTATNE_BOX.r}
              width={OSTATNE_BOX.r * 2}
              height={OSTATNE_BOX.r * 2}
              fill="none"
              stroke="#45452F"
              strokeWidth={2}
              strokeDasharray="8 6"
            />

            {/* leader lines + gutter labels */}
            {slots.map((s) => (
              <g key={s.name}>
                <line
                  x1={s.anchor === "end" ? s.labelX + 6 : s.labelX - 6}
                  y1={s.labelY}
                  x2={s.cx}
                  y2={s.cy}
                  stroke="#45452F"
                  strokeWidth={2}
                />
                <text
                  x={s.labelX}
                  y={s.labelY}
                  textAnchor={s.anchor}
                  className="ipm-region-label"
                  dominantBaseline="middle"
                >
                  {s.name}
                </text>
              </g>
            ))}

            {/* markers — squares = OR offices, circles = individuals */}
            {filtered.map((p) =>
              p.kind === "or" ? (
                <rect
                  key={p.node.id}
                  x={p.x - p.r}
                  y={p.y - p.r}
                  width={p.r * 2}
                  height={p.r * 2}
                  fill={p.color}
                  fillOpacity={0.82}
                  stroke="#0B0B09"
                  strokeWidth={1.5}
                >
                  <title>
                    {p.node.full_name} · OR · {p.region} ·{" "}
                    {p.node.total_cases.toLocaleString("en-GB")} prípadov
                  </title>
                </rect>
              ) : (
                <circle
                  key={p.node.id}
                  cx={p.x}
                  cy={p.y}
                  r={p.r}
                  fill={p.color}
                  fillOpacity={0.82}
                  stroke="#0B0B09"
                  strokeWidth={1.5}
                >
                  <title>
                    {p.node.full_name} · {p.region} ·{" "}
                    {p.node.total_cases.toLocaleString("en-GB")} prípadov
                  </title>
                </circle>
              ),
            )}
          </svg>
          {/* under the map: ONLY the source line */}
          <div className="ipm-source mono">
            Zdroj: The Gazette appointments → ip_network ({data.meta.total_ips.toLocaleString("en-GB")} entít)
          </div>
        </div>

        {/* ── CONTROLS (right) ── */}
        <div className="ipm-controls">
          <div className="ipm-count mono">
            <b>{filtered.length}</b> / {base.length} zobrazených
          </div>

          {/* (a) type toggles */}
          <div className="ipm-ctrl">
            <div className="ipm-ctrl-h mono">TYP ENTITY</div>
            <label className="ipm-check">
              <input
                type="checkbox"
                checked={showInd}
                onChange={(e) => setShowInd(e.target.checked)}
              />
              <span className="ipm-shape ipm-shape-circle" /> jednotlivci (IP)
            </label>
            <label className="ipm-check">
              <input
                type="checkbox"
                checked={showOR}
                onChange={(e) => setShowOR(e.target.checked)}
              />
              <span className="ipm-shape ipm-shape-square" /> úrady (Official
              Receiver)
            </label>
          </div>

          {/* (b) region multi-select (also the colour legend) */}
          <div className="ipm-ctrl">
            <div className="ipm-ctrl-h mono">
              REGIÓN{" "}
              {regions.size > 0 && (
                <button className="ipm-clear" onClick={() => setRegions(new Set())}>
                  zrušiť ({regions.size})
                </button>
              )}
            </div>
            <div className="ipm-chips">
              {labelRegions.map((name) => (
                <button
                  key={name}
                  className={`ipm-chip ${regions.has(name) ? "on" : ""}`}
                  onClick={() => toggleRegion(name)}
                >
                  <span
                    className="ipm-chip-dot"
                    style={{ background: REGION_COLORS[name] ?? REGION_COLORS["Ostatné"] }}
                  />
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* (c) min-cases slider */}
          <div className="ipm-ctrl">
            <div className="ipm-ctrl-h mono">
              MIN. PRÍPADOV: <b>{minCases}</b>
            </div>
            <input
              className="ipm-slider"
              type="range"
              min={0}
              max={maxCases}
              step={5}
              value={minCases}
              onChange={(e) => setMinCases(Number(e.target.value))}
            />
            <div className="ipm-slider-scale mono">
              <span>0</span>
              <span>{maxCases.toLocaleString("en-GB")}</span>
            </div>
          </div>

          {/* (d) name search */}
          <div className="ipm-ctrl">
            <div className="ipm-ctrl-h mono">HĽADAŤ MENO</div>
            <input
              className="ipm-search"
              type="text"
              placeholder="napr. Playford…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* explanatory notes moved here from under the map */}
          <div className="ipm-notes">
            Pozícia podľa <b>regiónu</b> (PSČ), nie presnej adresy · <b>bez hrán</b>{" "}
            · trhová štruktúra, nie MANO referral sieť. Tvar = typ (kruh =
            jednotlivec, štvorec = úrad OR), farba = región, veľkosť = počet
            prípadov. Zobrazených top {TOP_N} z{" "}
            {data.nodes.length.toLocaleString("en-GB")} entít (chvost = jednotky
            prípadov). Najväčší uzol: <b>OR Nottingham (1 108)</b>. Entity s PSČ
            mimo crosswalku sú v boxe „Ostatné".
          </div>
        </div>
      </div>
    </div>
  );
}
