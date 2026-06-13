import ReactECharts from "echarts-for-react";
import "../../lib/echartsTheme";
import { T } from "../../styles/tokens";
import { useFetch } from "../../hooks/useData";
import type { PriceHistory, Valuation } from "../../types/data";
import "./PriceChart.css";

/* MANO.L price history vs valuation anchors (NAV, Singer target, current).
 * RNS events as vertical markLines. Manual §18. */

function toTs(d: string): number {
  return new Date(d + "T00:00:00Z").getTime();
}

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

  const priceData: [number, number][] = hist.series.map((p) => [
    toTs(p.date),
    p.close,
  ]);

  const singerUpside =
    ((val.singer_target_gbx - val.price_gbx) / val.price_gbx) * 100;
  const navDiscount = Math.round(
    ((val.nav_per_share_gbx - val.price_gbx) / val.nav_per_share_gbx) * 100,
  );

  // horizontal anchor lines
  const anchorLine = (
    yVal: number,
    color: string,
    label: string,
    width: number,
    dashed: boolean,
  ) => ({
    yAxis: yVal,
    lineStyle: {
      color,
      width,
      type: dashed ? "dashed" : "solid",
    },
    label: {
      formatter: label,
      position: "end",
      rotate: 0,
      fontFamily: "JetBrains Mono",
      fontSize: 11,
      color,
    },
  });

  const option = {
    tooltip: { trigger: "axis" },
    grid: { top: 32, right: 96, bottom: 40, left: 56 },
    xAxis: {
      type: "time",
      min: toTs("2019-01-01"),
      axisLabel: { hideOverlap: true, fontSize: 12 }, // Law 7
    },
    yAxis: {
      type: "value",
      min: 0,
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
        sampling: "lttb",
        // valuation anchors + RNS verticals all hang off this series
        markLine: {
          symbol: "none",
          silent: true,
          data: [
            anchorLine(val.nav_per_share_gbx, T.text2, `NAV ~${val.nav_per_share_gbx}p`, 1, true),
            anchorLine(val.singer_target_gbx, T.up, `SINGER ${val.singer_target_gbx}p`, 2, true),
            anchorLine(val.price_gbx, T.gold, `${val.price_gbx}p (dnes)`, 2, false),
            ...hist.rns_events.map((e) => ({
              xAxis: toTs(e.date),
              lineStyle: { color: T.goldDim, width: 1, type: "dashed" as const },
              label: {
                formatter: e.label,
                position: "start",
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
      <ReactECharts option={option} theme="mano" style={{ height: 360 }} notMerge />

      <div className="price-explainer">
        <div className="price-col">
          <h3 className="price-col-head">NAV (Net Asset Value) ~95p</h3>
          <p className="price-col-body">
            NAV = účtovná hodnota MANO portfólia delená počtom akcií. Tvorí
            fair-value MANO existujúcich prípadov (£42m forward book) plus
            ostatné aktíva mínus dlhy. Cena pod NAV znamená, že trh diskontuje
            fair-value markmi — typické pre celý sektor po Muddy Waters short
            reporte (2019).
          </p>
          <div className="price-stat mono">
            Aktuálne: {val.price_gbx}p vs {val.nav_per_share_gbx}p NAV = trh
            diskontuje fair value o {navDiscount}%
          </div>
        </div>
        <div className="price-col">
          <h3 className="price-col-head">Singer target 130p</h3>
          <p className="price-col-body">
            Singer Capital Markets je jediný broker s coverage na MANO. Cieľ
            130p stojí na ~13× forward P/E pre projektované FY28 zisky.
            Single-analyst coverage znamená nízku konsenzus váhu — treba brať
            ako referenčný, nie konsenzus.
          </p>
          <div className="price-stat mono">
            Implikovaný upside: {val.price_gbx}p → {val.singer_target_gbx}p = +
            {singerUpside.toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
}
