import type { PricePoint } from "../types/data";

/* Drawdown helper — ONE canonical computation of the deepest historical
 * drawdown from price history, so the price chart and the underwater chart
 * never show two different roundings of "the drawdown". This is a pure
 * presentation transform of already-published price JSON (no model numbers).
 *
 * The running drawdown at each point is (close − runningPeak) / runningPeak.
 * `deepestPct` is the minimum (most negative) of that series, kept at ONE
 * decimal. Format with `fmtDrawdown` everywhere so the sign/decimal match. */

export interface Drawdown {
  /** Running drawdown series: [timestamp, pct≤0 at 1dp]. */
  series: [number, number][];
  /** Deepest (most negative) drawdown, one decimal, e.g. -93.5. */
  deepestPct: number;
}

export function computeDrawdown(
  points: PricePoint[],
  toTs: (d: string) => number,
): Drawdown {
  let peak = -Infinity;
  const series: [number, number][] = points.map((p) => {
    peak = Math.max(peak, p.close);
    const pct = ((p.close - peak) / peak) * 100; // ≤ 0
    return [toTs(p.date), Math.round(pct * 10) / 10];
  });
  const deepestPct = series.length
    ? Math.min(...series.map((d) => d[1]))
    : 0;
  return { series, deepestPct };
}

/** Canonical display string, one decimal, e.g. "−93.5%" (unicode minus). */
export function fmtDrawdown(pct: number): string {
  return `−${Math.abs(pct).toFixed(1)}%`;
}
