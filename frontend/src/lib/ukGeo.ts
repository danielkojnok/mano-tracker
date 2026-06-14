/* Real UK ITL1/NUTS1 geometry → SVG paths (PART 6 + PART 7 share this base).
 *
 * Source: Eurostat GISCO NUTS 2021 1:20M, filtered to the 12 UK NUTS1 regions
 * and bundled offline at src/data/ukRegions.geo.json (no runtime fetch). Each
 * feature's properties.name is the Slovak region key, identical to the keys in
 * regional.json, so counts join by name with no extra crosswalk.
 *
 * Geometry is real boundaries (rounded to 4 decimals ≈ 11 m). We project with a
 * plain Web-Mercator and fit to a fixed viewBox — flat, no smoothing, so the
 * angular page style is preserved. We compute, per region, the largest-ring
 * centroid (for labels / marker anchoring) and an in-region jitter radius. */

import raw from "../data/ukRegions.geo.json";

type Ring = number[][];
interface Feature {
  properties: { name: string; name_en: string; nuts_id: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown };
}
const FC = raw as unknown as { features: Feature[] };

const VIEW_W = 1000;
const PAD = 24;

function mercator(lon: number, lat: number): [number, number] {
  const x = (lon * Math.PI) / 180;
  const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  return [x, y];
}

/** outer rings of a feature as arrays of [lon,lat] pairs */
function outerRings(f: Feature): Ring[] {
  const g = f.geometry;
  if (g.type === "Polygon") return [(g.coordinates as number[][][])[0]];
  // MultiPolygon: first ring of each polygon is the outer ring
  return (g.coordinates as number[][][][]).map((poly) => poly[0]);
}

/** shoelace area + centroid of a projected ring */
function ringCentroid(pts: [number, number][]): { area: number; cx: number; cy: number } {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const cross = x0 * y1 - x1 * y0;
    a += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-12) {
    // degenerate — fall back to vertex mean
    const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    return { area: 0, cx: mx, cy: my };
  }
  return { area: Math.abs(a), cx: cx / (6 * a), cy: cy / (6 * a) };
}

export interface RegionGeom {
  name: string;
  nameEn: string;
  path: string; // SVG path data covering all rings
  cx: number; // label / anchor centre (largest ring centroid), in viewBox units
  cy: number;
  radius: number; // in-region jitter radius (viewBox units)
}

export interface UkGeo {
  width: number;
  height: number;
  regions: RegionGeom[];
}

function build(): UkGeo {
  // 1) project every coordinate, track global bbox
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const projected = FC.features.map((f) => {
    const rings = outerRings(f).map((ring) =>
      ring.map(([lon, lat]) => {
        const [px, py] = mercator(lon, lat);
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        return [px, py] as [number, number];
      }),
    );
    return { f, rings };
  });

  const dataW = maxX - minX;
  const dataH = maxY - minY;
  const scale = (VIEW_W - 2 * PAD) / dataW;
  const height = dataH * scale + 2 * PAD;

  // mercator y grows north; SVG y grows down → flip
  const sx = (px: number) => PAD + (px - minX) * scale;
  const sy = (py: number) => height - PAD - (py - minY) * scale;

  const regions: RegionGeom[] = projected.map(({ f, rings }) => {
    // SVG path across all rings
    const path = rings
      .map(
        (ring) =>
          "M" +
          ring.map(([px, py]) => `${sx(px).toFixed(1)},${sy(py).toFixed(1)}`).join("L") +
          "Z",
      )
      .join("");

    // largest ring → centroid + radius
    let best = { area: -1, cx: 0, cy: 0, minx: 0, maxx: 0, miny: 0, maxy: 0 };
    for (const ring of rings) {
      const screen = ring.map(([px, py]) => [sx(px), sy(py)] as [number, number]);
      const c = ringCentroid(screen);
      if (c.area > best.area) {
        const xs = screen.map((p) => p[0]);
        const ys = screen.map((p) => p[1]);
        best = {
          area: c.area,
          cx: c.cx,
          cy: c.cy,
          minx: Math.min(...xs),
          maxx: Math.max(...xs),
          miny: Math.min(...ys),
          maxy: Math.max(...ys),
        };
      }
    }
    const radius =
      0.34 * Math.min(best.maxx - best.minx, best.maxy - best.miny);

    return {
      name: f.properties.name,
      nameEn: f.properties.name_en,
      path,
      cx: best.cx,
      cy: best.cy,
      radius: Math.max(6, radius),
    };
  });

  return { width: VIEW_W, height, regions };
}

export const UK_GEO: UkGeo = build();

/** Region colour palette (stable, dashboard-derived) shared by the IP map. */
export const REGION_COLORS: Record<string, string> = {
  Londýn: "#F5C400",
  Severozápad: "#4CB8E8",
  Yorkshire: "#9B6DD6",
  Východ: "#3DC97B",
  "West Midlands": "#E5884D",
  Juhovýchod: "#5BC9A8",
  "East Midlands": "#D6B84C",
  Juhozápad: "#7AA6D6",
  Severovýchod: "#C0708A",
  Škótsko: "#6FB1E0",
  Wales: "#C9A23D",
  "Severné Írsko": "#A88AD6",
  Ostatné: "#A8A493",
};

/** Deterministic [0,1) hash from a string — stable jitter across renders. */
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}
