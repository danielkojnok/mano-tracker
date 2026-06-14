import { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import "../../lib/echartsTheme";
import { T } from "../../styles/tokens";
import { useFetch } from "../../hooks/useData";
import type { Tornado } from "../../types/data";

/* Tornado — sensitivity of base FY27 revenue to each parameter (manual §25.3).
 * Horizontal diverging bars from the base value, sorted by swing magnitude, so
 * the assumption that matters most reads at a glance. All values from
 * tornado.json (model/pipeline.py); the frontend computes nothing here.
 *
 * Some rows (referral / acceptance / compulsory_weight) genuinely barely move
 * the headline because the capacity cap binds — their swing is ~£1.5m on one
 * side only. We do NOT inflate them: each leg is drawn at its true position,
 * but a tiny/zero leg is floored to a small pixel STUB so the row stays legible,
 * and every row carries explicit −20% / +20% value labels. A custom renderItem
 * is used because stacked bars drop zero-width segments entirely. */

const MIN_STUB_PX = 4; // a ~0 leg still paints a small, honest stub

export default function TornadoChart() {
  const { data, loading, error } = useFetch<Tornado>("tornado.json");
  // §00 Zákon 8 — simplified mode when the panel is phone-narrow (<480).
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 480,
  );
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 480);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (loading) return <div className="chart-skeleton" style={{ height: 280 }} />;
  if (error || !data)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const base = data.base_m;
  // ECharts category axis renders bottom→top, so reverse to put the biggest
  // swing on top.
  const rows = [...data.rows].reverse();
  const cats = rows.map((r) => r.label);

  const allVals = rows.flatMap((r) => [r.low_m, r.high_m, base]);
  const lo = Math.min(...allVals);
  const hi = Math.max(...allVals);
  // symmetric-ish padding around base, in £m relative to base
  const axisMin = Math.min(lo, base) - base - 1.5;
  const axisMax = Math.max(hi, base) - base + 1.5;

  // One custom datum per row: [rowIndex, lowDelta, highDelta] (relative to base).
  const customData = rows.map((r, i) => [i, r.low_m - base, r.high_m - base]);

  type RenderApi = {
    value: (i: number) => number;
    coord: (p: [number, number]) => [number, number];
    size: (p: [number, number]) => [number, number];
  };

  const renderItem = (_params: unknown, api: RenderApi) => {
    const idx = api.value(0);
    const lowDelta = api.value(1);
    const highDelta = api.value(2);

    const [xBase, y] = api.coord([0, idx]);
    const [xLow] = api.coord([lowDelta, idx]);
    const [xHigh] = api.coord([highDelta, idx]);
    const bandH = api.size([0, 1])[1] * 0.55;

    // Floor each leg to a minimum pixel stub so a ~0 swing is still visible,
    // drawn on the correct side of base (left for low, right for high).
    const legRect = (xEnd: number, color: string) => {
      const raw = xEnd - xBase;
      const dir = raw < 0 ? -1 : 1;
      const w = Math.max(Math.abs(raw), raw === 0 ? 0 : MIN_STUB_PX);
      const x = dir < 0 ? xBase - w : xBase;
      return {
        type: "rect" as const,
        shape: { x, y: y - bandH / 2, width: w, height: bandH },
        style: { fill: color, opacity: 0.85 },
      };
    };

    const children = [];
    if (lowDelta !== 0) children.push(legRect(xLow, T.down));
    if (highDelta !== 0) children.push(legRect(xHigh, T.up));

    return { type: "group" as const, children };
  };

  // <480: shrink the left gutter, WRAP the driver labels by word (no mid-word
  // cut, no truncation) and HIDE the x-axis tick numbers (they collide into one
  // string — the per-row ±20% labels + gold base line already give the values).
  const labelFs = narrow ? 9 : 11;
  const option = {
    grid: {
      top: 16,
      right: narrow ? 52 : 96,
      bottom: narrow ? 24 : 32,
      left: narrow ? 84 : 160,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: { dataIndex: number }[]) => {
        const i = params[0]?.dataIndex ?? 0;
        const r = rows[i];
        return `${r.label}<br/>−20%: £${r.low_m}m<br/>+20%: £${r.high_m}m<br/>swing: £${r.swing_m}m`;
      },
    },
    xAxis: {
      type: "value",
      min: axisMin,
      max: axisMax,
      axisLabel: {
        show: !narrow,
        formatter: (v: number) => `£${(base + v).toFixed(0)}m`,
        fontSize: 11,
        hideOverlap: true,
      },
    },
    yAxis: {
      type: "category",
      data: cats,
      axisLabel: {
        fontSize: labelFs,
        color: T.text2,
        lineHeight: narrow ? 11 : 14,
        formatter: narrow ? (v: string) => v.replace(/\s+/g, "\n") : undefined,
      },
    },
    series: [
      {
        type: "custom",
        renderItem,
        encode: { x: [1, 2], y: 0 },
        data: customData,
        // explicit per-row value labels at both ends (always shown, even for a
        // stub leg) via a paired scatter so labels never sit inside a 4px stub.
        z: 2,
      },
      // low-value labels (left of base) — high contrast (bright text + a dark
      // text outline) so the small rows' values stay readable over any fill.
      {
        type: "scatter",
        symbolSize: 0,
        data: rows.map((r, i) => [r.low_m - base, i]),
        label: {
          show: true,
          position: "left",
          formatter: (p: { dataIndex: number }) => `£${rows[p.dataIndex].low_m}m`,
          fontFamily: "JetBrains Mono",
          fontSize: labelFs,
          fontWeight: 600,
          color: T.text,
          textBorderColor: T.bg1,
          textBorderWidth: 3,
        },
        tooltip: { show: false },
        z: 3,
      },
      // high-value labels (right of base)
      {
        type: "scatter",
        symbolSize: 0,
        data: rows.map((r, i) => [r.high_m - base, i]),
        label: {
          show: true,
          position: "right",
          formatter: (p: { dataIndex: number }) => `£${rows[p.dataIndex].high_m}m`,
          fontFamily: "JetBrains Mono",
          fontSize: labelFs,
          fontWeight: 600,
          color: T.text,
          textBorderColor: T.bg1,
          textBorderWidth: 3,
        },
        tooltip: { show: false },
        z: 3,
      },
      // base reference line
      {
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
        ich nárast nezvýši tržbu (asymetria je reálne správanie modelu). Malé
        riadky sú zámerne malé — zobrazujú reálnu hodnotu, nie nafúknutú.
      </div>
    </div>
  );
}
