import ReactECharts from "echarts-for-react";
import "../../lib/echartsTheme";
import { T } from "../../styles/tokens";
import { useFetch } from "../../hooks/useData";
import type { Valuation } from "../../types/data";
import "./ValuationGap.css";

/* Oceňovacia medzera — horizontal bullet/range chart, GBX 0→140.
 * Markers: cena (gold), NAV (text-2), Singer target (up). */

export default function ValuationGap() {
  const { data, loading, error } = useFetch<Valuation>("valuation.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 200 }} />;
  if (error || !data)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const markers: { x: number; color: string; label: string }[] = [
    { x: data.price_gbx, color: T.gold, label: `CENA ${data.price_gbx}` },
    { x: data.nav_per_share_gbx, color: T.text2, label: `NAV ~${data.nav_per_share_gbx}p` },
    { x: data.singer_target_gbx, color: T.up, label: `SINGER ${data.singer_target_gbx}p` },
  ];

  const navUpside = ((data.nav_per_share_gbx - data.price_gbx) / data.price_gbx) * 100;
  const singerUpside =
    ((data.singer_target_gbx - data.price_gbx) / data.price_gbx) * 100;

  const option = {
    grid: { top: 40, right: 24, bottom: 32, left: 16 },
    xAxis: {
      type: "value",
      min: 0,
      max: 140,
      interval: 20,
      axisLabel: { fontSize: 12, formatter: "{value}p" },
      splitLine: { lineStyle: { color: T.rowLine, type: "dotted" } },
    },
    yAxis: {
      type: "category",
      data: [""],
      axisLine: { show: false },
      axisLabel: { show: false },
    },
    series: [
      // baseline track from price to Singer target (the "gap")
      {
        type: "bar",
        data: [data.singer_target_gbx],
        barWidth: 6,
        itemStyle: { color: T.border },
        silent: true,
        z: 1,
      },
      // markers as points with labels
      {
        type: "scatter",
        symbol: "rect",
        symbolSize: [4, 28],
        data: markers.map((m) => ({
          value: [m.x, 0],
          itemStyle: { color: m.color },
          label: {
            show: true,
            position: m.x > 110 ? "left" : "top",
            formatter: m.label,
            fontFamily: "JetBrains Mono",
            fontSize: 12,
            color: m.color,
            distance: 8,
          },
        })),
        z: 2,
      },
    ],
    tooltip: { show: false },
  };

  return (
    <div>
      <ReactECharts option={option} theme="mano" style={{ height: 160 }} notMerge />
      <div className="valgap-stats mono">
        <span>
          vs NAV floor: <span className="up">+{navUpside.toFixed(0)}%</span>
        </span>
        <span>
          vs Singer target: <span className="up">+{singerUpside.toFixed(0)}%</span>
        </span>
        <span>
          P/B <span className="valgap-pb">{data.pb_ratio.toFixed(1)}×</span>
        </span>
      </div>
    </div>
  );
}
