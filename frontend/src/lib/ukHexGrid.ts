/* Shared stylised-UK hex grid. The regional hex cartogram (RegionalHexMap) and
 * the IP market-structure map (IpConstellation) both place things in the SAME
 * ~12 ITL1 region zones so the two panels read as the same geography.
 *
 * Positions are a deliberate cartogram (manual §12: abstract vector UK map,
 * Scotland top, NI detached left, London bottom-right) — not real coordinates.
 * Keyed by the Slovak region names used across the app. */

export interface HexPos {
  col: number;
  row: number;
}

export const HEX_POS: Record<string, HexPos> = {
  "Škótsko": { col: 2, row: 0 },
  "Severné Írsko": { col: 0, row: 1 },
  "Severovýchod": { col: 3, row: 1 },
  "Severozápad": { col: 2, row: 2 },
  "Yorkshire": { col: 3, row: 2 },
  "Wales": { col: 1, row: 3 },
  "West Midlands": { col: 2, row: 3 },
  "East Midlands": { col: 3, row: 3 },
  "Východ": { col: 4, row: 3 },
  "Juhozápad": { col: 1, row: 4 },
  "Juhovýchod": { col: 3, row: 4 },
  "Londýn": { col: 4, row: 4 },
};

export const HEX_MAX_ROW = 4; // largest row index in HEX_POS

// hex geometry — pointy-top hexes in an odd-r offset layout
export const HEX_R = 38; // circumradius
export const HEX_W = Math.sqrt(3) * HEX_R; // pointy-top width
export const HEX_H = 2 * HEX_R; // pointy-top height
export const V_SPACING = HEX_H * 0.75; // row vertical advance
export const HEX_MARGIN = 14;

/** Centre of the hex at (col, row) in the shared grid. */
export function hexCenter(col: number, row: number): [number, number] {
  const xOff = row % 2 === 1 ? HEX_W / 2 : 0;
  const cx = HEX_MARGIN + HEX_W / 2 + col * HEX_W + xOff;
  const cy = HEX_MARGIN + HEX_H / 2 + row * V_SPACING;
  return [cx, cy];
}

/** SVG path for a pointy-top hexagon centred at (cx, cy). */
export function hexPath(cx: number, cy: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 180) * (60 * i - 90);
    pts.push(
      `${(cx + HEX_R * Math.cos(ang)).toFixed(1)},${(cy + HEX_R * Math.sin(ang)).toFixed(1)}`,
    );
  }
  return `M${pts.join("L")}Z`;
}

/** viewBox dimensions for the shared grid. */
export function hexViewBox(): { w: number; h: number } {
  return {
    w: HEX_MARGIN * 2 + HEX_W * 5.5,
    h: HEX_MARGIN * 2 + HEX_H + V_SPACING * HEX_MAX_ROW,
  };
}
