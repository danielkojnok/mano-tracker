import ReactECharts from "echarts-for-react";
import "../../lib/echartsTheme";
import { T } from "../../styles/tokens";
import { useFetch } from "../../hooks/useData";
import type { Tornado } from "../../types/data";

/* Tornado — sensitivity of base FY27 revenue to each parameter (manual §25.3).
 * Horizontal diverging bars from the base value, sorted by swing magnitude, so
 * the assumption that matters most reads at a glance. All values from
 * tornado.json (model/pipeline.py); the frontend computes nothing here. */
export default function TornadoChart() {
  const { data, loading, error } = useFetch<Tornado>("tornado.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 280 }} />;
  if (error || !data)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const base = data.base_m;
  // ECharts category axis renders bottom→top, so reverse to put the biggest
  // swing on top.
  const rows = [...data.rows].reverse();
  const cats = rows.map((r) => r.label);

  // Two stacked bar series anchored at `base`: the low leg (base→low, usually
  // negative) and the high leg (base→high). Each bar starts at base.
  const lowLeg = rows.map((r) => r.low_m - base); // ≤ 0 typically
  const highLeg = rows.map((r) => r.high_m - base); // ≥ 0 typically

  const allVals = rows.flatMap((r) => [r.low_m, r.high_m, base]);
  const lo = Math.min(...allVals);
  const hi = Math.max(...allVals);
  const padded = (v: number) => v - base;

  const option = {
    grid: { top: 16, right: 80, bottom: 32, left: 150 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: { dataIndex: number }[]) => {
        const i = params[0].dataIndex;
        const r = rows[i];
        return `${r.label}<br/>−20%: £${r.low_m}m<br/>+20%: £${r.high_m}m<br/>swing: £${r.swing_m}m`;
      },
    },
    xAxis: {
      type: "value",
      min: padded(lo) - 1.5,
      max: padded(hi) + 1.5,
      axisLabel: {
        formatter: (v: number) => `£${(base + v).toFixed(0)}m`,
        fontSize: 11,
      },
    },
    yAxis: {
      type: "category",
      data: cats,
      axisLabel: { fontSize: 11, color: T.text2 },
    },
    series: [
      {
        name: "−20%",
        type: "bar",
        stack: "tornado",
        data: lowLeg,
        itemStyle: { color: T.down, opacity: 0.85 },
        barWidth: "55%",
        label: {
          show: true,
          position: "left",
          formatter: (p: { dataIndex: number }) => `£${rows[p.dataIndex].low_m}m`,
          fontFamily: "JetBrains Mono",
          fontSize: 11,
          color: T.text2,
        },
      },
      {
        name: "+20%",
        type: "bar",
        stack: "tornado",
        data: highLeg,
        itemStyle: { color: T.up, opacity: 0.85 },
        barWidth: "55%",
        label: {
          show: true,
          position: "right",
          formatter: (p: { dataIndex: number }) => `£${rows[p.dataIndex].high_m}m`,
          fontFamily: "JetBrains Mono",
          fontSize: 11,
          color: T.text2,
        },
      },
      // base reference line
      {
        name: "base",
        type: "line",
        data: [],
        markLine: {
          symbol: "none",
          silent: true,
          data: [
            {
              xAxis: 0,
              lineStyle: { color: T.gold, width: 1.5, type: "solid" as const },
              label: {
                formatter: `£${base}m`,
                position: "end" as const,
                fontFamily: "JetBrains Mono",
                fontSize: 11,
                color: T.gold,
              },
            },
          ],
        },
      },
    ],
  };

  return (
    <div>
      <ReactECharts option={option} theme="mano" style={{ height: 260 }} notMerge />
      <div className="tornado-note mono">
        Zlatá os = base <b className="gold">£{base}m</b>. {data.note} ARRCC a
        capacity cap dominujú — referral/acceptance/weight narážajú na cap, takže
        ich nárast nezvýši tržbu (asymetria je reálne správanie modelu).
      </div>
    </div>
  );
}
