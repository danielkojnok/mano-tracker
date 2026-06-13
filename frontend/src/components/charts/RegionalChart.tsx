import ReactECharts from "echarts-for-react";
import "../../lib/echartsTheme";
import { T } from "../../styles/tokens";
import { useFetch } from "../../hooks/useData";
import type { Regional } from "../../types/data";

/* Regional distribution — firms by UK region, derived from real
 * ip_postal_code prefixes in the CH enrichment (no fake geo, no fabricated
 * hex map). A treemap (area = firm count) is used because a UK-regions GeoJSON
 * is not readily registerable here; the full hex map is backlog. From
 * regional.json. */

export default function RegionalChart() {
  const { data, loading, error } = useFetch<Regional>("regional.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 300 }} />;
  if (error || !data || data.regions.length === 0)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const max = Math.max(...data.regions.map((r) => r.count));
  // colour ramp bg-2 → gold-dim → gold by share (manual heat scale)
  const colorFor = (v: number) => {
    const t = v / max;
    if (t > 0.66) return T.gold;
    if (t > 0.33) return T.goldDim;
    return T.signal;
  };

  const option = {
    tooltip: {
      formatter: (p: { name: string; value: number }) =>
        `${p.name}<br/>${p.value.toLocaleString("en-GB")} firiem`,
    },
    series: [
      {
        type: "treemap",
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: {
          show: true,
          fontFamily: "JetBrains Mono",
          fontSize: 12,
          color: "#0B0B09",
          formatter: (p: { name: string; value: number }) =>
            `${p.name}\n${p.value.toLocaleString("en-GB")}`,
        },
        itemStyle: { borderColor: T.bg1, borderWidth: 2, gapWidth: 2 },
        data: data.regions.map((r) => ({
          name: r.region,
          value: r.count,
          itemStyle: { color: colorFor(r.count) },
        })),
      },
    ],
  };

  return (
    <div>
      <ReactECharts option={option} theme="mano" style={{ height: 300 }} notMerge />
      <div className="chart-footnote">
        Plocha = počet firiem v regióne (z IP poštových smerovacích čísel,{" "}
        {data.coverage_pct}% pokrytie, {data.mapped_firms.toLocaleString("en-GB")}{" "}
        z {data.total_firms.toLocaleString("en-GB")}). Plná hex mapa je v
        backlogu — nepredstierame ju. Zdroj: Companies House enrichment.
      </div>
    </div>
  );
}
