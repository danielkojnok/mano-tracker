import ReactECharts from "echarts-for-react";
import "../../lib/echartsTheme";
import { T } from "../../styles/tokens";
import { useFetch } from "../../hooks/useData";
import type { PriceHistory, Valuation } from "../../types/data";
import { computeDrawdown, fmtDrawdown } from "../../lib/drawdown";
import "./PriceChart.css";

/* MANO.L price vs valuation anchors — the scale-sanity test (manual §18).
 *
 * The entire investment thesis lives in the 39–130p range, so the y-axis is
 * scaled to ~0–150p, NOT padded to the irrelevant 2020 spike (~560p). We
 * window the price line to the period it has actually traded inside the
 * thesis range (2024-06 onward); earlier history sat at 200–560p and would
 * dictate a scale that crushes the very gap we want to show. The upside gap
 * to the Singer target is shaded so "deeply discounted" reads at a glance. */

function toTs(d: string): number {
  return new Date(d + "T00:00:00Z").getTime();
}

// Window start: the price has traded within the thesis range since ~2024-06.
const WINDOW_START = "2024-06-01";
const Y_MAX = 150; // thesis range ceiling — 39/95/130 sit clearly separated

export default function PriceChart() {
  const { data: hist, loading: l1, error: e1 } = useFetch<PriceHistory>(
    "mano_price_history.json",
  );
  const { data: val, loading: l2, error: e2 } = useFetch<Valuation>(
    "valuation.json",
  );

  if (l1 || l2) return <div className="chart-skeleton" style={{ height: 360 }} />;
  if (e1 || e2 || !hist || !val)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const startTs = toTs(WINDOW_START);
  const windowed = hist.series.filter((p) => toTs(p.date) >= startTs);
  const priceData: [number, number][] = windowed.map((p) => [toTs(p.date), p.close]);

  // Canonical drawdown — deepest historical trough, one decimal, shared with
  // the underwater chart so the two never show different roundings.
  const { deepestPct: drawdownPct } = computeDrawdown(hist.series, toTs);
  const navUpside = Math.round(((val.nav_per_share_gbx - val.price_gbx) / val.price_gbx) * 100);
  const singerUpside = Math.round(((val.singer_target_gbx - val.price_gbx) / val.price_gbx) * 100);
  const navDiscount = Math.round(
    ((val.nav_per_share_gbx - val.price_gbx) / val.nav_per_share_gbx) * 100,
  );

  const anchorLine = (
    yVal: number,
    color: string,
    label: string,
    width: number,
    dashed: boolean,
  ) => ({
    yAxis: yVal,
    lineStyle: { color, width, type: dashed ? ("dashed" as const) : ("solid" as const) },
    label: {
      formatter: label,
      position: "end" as const,
      rotate: 0,
      fontFamily: "JetBrains Mono",
      fontSize: 11,
      color,
    },
  });

  const onlyRecent = hist.rns_events.filter((e) => toTs(e.date) >= startTs);

  const option = {
    tooltip: { trigger: "axis" },
    grid: { top: 24, right: 104, bottom: 40, left: 48 },
    xAxis: {
      type: "time",
      min: startTs,
      axisLabel: { hideOverlap: true, fontSize: 12 }, // Law 7
    },
    yAxis: {
      type: "value",
      min: 0,
      max: Y_MAX,
      interval: 30,
      axisLabel: { fontSize: 12, formatter: "{value}p" },
    },
    series: [
      // Shaded upside gap: a transparent baseline at the price floor + a band
      // up to the Singer target, so the "discount" space is visible.
      {
        name: "gap-base",
        type: "line",
        data: [
          [startTs, val.price_gbx],
          [toTs(windowed[windowed.length - 1].date), val.price_gbx],
        ],
        symbol: "none",
        lineStyle: { opacity: 0 },
        stack: "gap",
        tooltip: { show: false },
        silent: true,
        z: 1,
      },
      {
        name: "gap-span",
        type: "line",
        data: [
          [startTs, val.singer_target_gbx - val.price_gbx],
          [toTs(windowed[windowed.length - 1].date), val.singer_target_gbx - val.price_gbx],
        ],
        symbol: "none",
        lineStyle: { opacity: 0 },
        areaStyle: { color: T.up, opacity: 0.07 },
        stack: "gap",
        tooltip: { show: false },
        silent: true,
        z: 1,
      },
      {
        name: "MANO.L",
        type: "line",
        data: priceData,
        symbol: "none",
        smooth: false,
        lineStyle: { color: T.signal, width: 2.5 },
        itemStyle: { color: T.signal },
        z: 3,
        markLine: {
          symbol: "none",
          silent: true,
          data: [
            anchorLine(val.nav_per_share_gbx, T.text2, `NAV ~${val.nav_per_share_gbx}p`, 1, true),
            anchorLine(val.singer_target_gbx, T.up, `SINGER ${val.singer_target_gbx}p`, 2, true),
            anchorLine(val.price_gbx, T.gold, `${val.price_gbx}p dnes`, 2, false),
            ...onlyRecent.map((e) => ({
              xAxis: toTs(e.date),
              lineStyle: { color: T.goldDim, width: 1, type: "dashed" as const },
              label: {
                formatter: e.label,
                position: "start" as const,
                rotate: 0,
                fontFamily: "JetBrains Mono",
                fontSize: 10,
                color: T.goldDim,
              },
            })),
          ],
        },
      },
    ],
  };

  return (
    <div>
      {/* compact stat line — drawdown / upside, all computed from anchors */}
      <div className="price-stats mono">
        <span>
          Drawdown z peaku <b className="down">{fmtDrawdown(drawdownPct)}</b>
        </span>
        <span className="price-stats-sep">·</span>
        <span>
          Upside k NAV <b className="up">+{navUpside}%</b>
        </span>
        <span className="price-stats-sep">·</span>
        <span>
          Upside k Singer <b className="gold">+{singerUpside}%</b>
        </span>
      </div>

      <ReactECharts option={option} theme="mano" style={{ height: 340 }} notMerge />

      <div className="price-explainer">
        <div className="price-col">
          <h3 className="price-col-head">NAV (Net Asset Value) ~{val.nav_per_share_gbx}p</h3>
          <p className="price-col-body">
            NAV = účtovná hodnota MANO portfólia (£{val.case_nav_m}m fair-value
            prípadov + ostatné aktíva − dlhy) delená počtom akcií. Cena ~
            {navDiscount}% pod NAV znamená, že trh diskontuje fair-value markmi —
            sektorovo rozšírený diskont od Muddy Waters short reportu (2019).
          </p>
        </div>
        <div className="price-col">
          <h3 className="price-col-head">Singer target {val.singer_target_gbx}p</h3>
          <p className="price-col-body">
            Singer Capital Markets je jediný broker s coverage na MANO →
            single-analyst znamená nízku konsenzus váhu, ber ako referenčný, nie
            konsenzus. Zároveň je to etablovaný AIM broker, takže cieľ nie je
            bezvýznamný. Upside k cieľu: <b className="gold">+{singerUpside}%</b>.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── PriceChartFull — FULL-history variant for the Company page (R3) ─────────
 *
 * Overview's windowed PriceChart above is UNTOUCHED. This is a separate
 * component so the two can never break each other.
 *
 * Full history 2019→today spans ~30p to ~560p (the 2020 spike). A linear axis
 * would crush the whole thesis range (39/95/130p) into the bottom ~25% and
 * waste the rest on the one-off spike. The value range is genuinely ~18×, so a
 * LOG y-axis is justified (manual §07): it keeps every era — the 560p peak, the
 * −93% collapse, and the 39p present — readable at once. RNS markers and the
 * three valuation anchors are kept. */
export function PriceChartFull() {
  const { data: hist, loading: l1, error: e1 } = useFetch<PriceHistory>(
    "mano_price_history.json",
  );
  const { data: val, loading: l2, error: e2 } = useFetch<Valuation>(
    "valuation.json",
  );

  if (l1 || l2) return <div className="chart-skeleton" style={{ height: 380 }} />;
  if (e1 || e2 || !hist || !val)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const priceData: [number, number][] = hist.series.map((p) => [toTs(p.date), p.close]);
  const peak = Math.max(...hist.series.map((p) => p.close));
  const trough = Math.min(...hist.series.map((p) => p.close));
  // Canonical drawdown — same helper as the windowed chart and the underwater
  // chart, so "−93.5%" is identical everywhere.
  const { deepestPct: drawdownPct } = computeDrawdown(hist.series, toTs);

  const anchor = (yVal: number, color: string, label: string, dashed: boolean) => ({
    yAxis: yVal,
    lineStyle: { color, width: dashed ? 1 : 2, type: dashed ? ("dashed" as const) : ("solid" as const) },
    label: {
      formatter: label,
      position: "end" as const,
      rotate: 0,
      fontFamily: "JetBrains Mono",
      fontSize: 11,
      color,
    },
  });

  const option = {
    tooltip: { trigger: "axis" },
    // extra top headroom so the staggered RNS labels sit above the plot
    // instead of over the x-axis ticks.
    grid: { top: 40, right: 96, bottom: 40, left: 52 },
    xAxis: {
      type: "time",
      axisLabel: { hideOverlap: true, fontSize: 12 },
    },
    yAxis: {
      type: "log",
      // log axis — value range ~30→560p genuinely demands it (manual §07).
      min: 20,
      max: 600,
      axisLabel: { fontSize: 12, formatter: "{value}p" },
    },
    series: [
      {
        name: "MANO.L",
        type: "line",
        data: priceData,
        symbol: "none",
        smooth: false,
        lineStyle: { color: T.signal, width: 2 },
        itemStyle: { color: T.signal },
        z: 3,
        markLine: {
          symbol: "none",
          silent: true,
          data: [
            anchor(val.singer_target_gbx, T.up, `SINGER ${val.singer_target_gbx}p`, true),
            anchor(val.nav_per_share_gbx, T.text2, `NAV ~${val.nav_per_share_gbx}p`, true),
            anchor(val.price_gbx, T.gold, `${val.price_gbx}p dnes`, false),
            // RNS event markers — labels pinned to the TOP of each line
            // (position "end") so they sit above the plot and no longer collide
            // with the year tick labels on the x-axis. They are vertically
            // staggered (alternating distance) so adjacent labels don't overlap
            // each other either.
            ...hist.rns_events.map((e, i) => ({
              xAxis: toTs(e.date),
              lineStyle: { color: T.goldDim, width: 1, type: "dashed" as const },
              label: {
                formatter: e.label,
                position: "end" as const,
                distance: i % 2 === 0 ? 4 : 16,
                rotate: 0,
                fontFamily: "JetBrains Mono",
                fontSize: 10,
                color: T.goldDim,
              },
            })),
          ],
        },
      },
    ],
  };

  return (
    <div>
      <div className="price-stats mono">
        <span>
          Peak <b className="mono">{Math.round(peak)}p</b> (2020)
        </span>
        <span className="price-stats-sep">·</span>
        <span>
          Dno <b className="mono">{Math.round(trough)}p</b>
        </span>
        <span className="price-stats-sep">·</span>
        <span>
          Dnes <b className="gold">{val.price_gbx}p</b>
        </span>
        <span className="price-stats-sep">·</span>
        <span>
          Drawdown z peaku <b className="down">{fmtDrawdown(drawdownPct)}</b>
        </span>
      </div>
      <ReactECharts option={option} theme="mano" style={{ height: 360 }} notMerge />
      <div className="price-fullnote mono">
        Logaritmická os — celá história 2019→dnes pokrýva ~18× rozsah (30p–560p);
        lineárna os by stlačila tézový rozsah 39/95/130p do dolnej štvrtiny.
        Zvislé čiarkované = RNS udalosti.
      </div>
    </div>
  );
}
