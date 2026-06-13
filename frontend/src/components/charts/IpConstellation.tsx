import ReactECharts from "echarts-for-react";
import "../../lib/echartsTheme";
import { T } from "../../styles/tokens";
import { useFetch } from "../../hooks/useData";
import type { IPNetwork } from "../../types/data";
import { areaToRegion, REGION_ORDER } from "../../lib/ukRegions";

/* IP market-structure constellation (manual §13) — IP firms as nodes sized by
 * total_cases, clustered/coloured by UK region.
 *
 * HONESTY (critical): there is NO MANO-case→IP linkage in the data and NO real
 * firm-to-firm relationship, so there are NO EDGES. This is a packed-bubble /
 * region-cluster layout titled "trhová štruktúra IP firiem" — it is NOT a MANO
 * referral network. The long tail of single-case firms is dropped (manual
 * density laws) and the cap is stated honestly. From ip_network.json. */

const TOP_N = 140; // render the largest firms; the tail is single-digit noise

const REGION_COLORS: Record<string, string> = {
  "Londýn": T.gold,
  "Severozápad": T.signal,
  "Yorkshire": "#9B6DD6",
  "Východ": "#3DC97B",
  "West Midlands": "#E5884D",
  "Juhovýchod": "#4CB8E8",
  "East Midlands": "#D6B84C",
  "Juhozápad": "#5BC9A8",
  "Severovýchod": "#C0708A",
  "Škótsko": "#7AA6D6",
  "Wales": "#C9A23D",
  "Severné Írsko": "#A88AD6",
  "Ostatné": T.text2,
};

export default function IpConstellation() {
  const { data, loading, error } = useFetch<IPNetwork>("ip_network.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 440 }} />;
  if (error || !data || data.nodes.length === 0)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const sorted = [...data.nodes].sort((a, b) => b.total_cases - a.total_cases);
  const shown = sorted.slice(0, TOP_N);
  const maxCases = shown[0]?.total_cases ?? 1;

  // categories = regions actually present (in stable order)
  const presentRegions = REGION_ORDER.filter((r) =>
    shown.some((n) => areaToRegion(n.primary_region) === r),
  );
  const categories = presentRegions.map((r) => ({
    name: r,
    itemStyle: { color: REGION_COLORS[r] ?? T.text2 },
  }));
  const catIdx = new Map(presentRegions.map((r, i) => [r, i]));

  const symbolSize = (cases: number) => 6 + Math.sqrt(cases / maxCases) * 46;

  const nodes = shown.map((n) => {
    const region = areaToRegion(n.primary_region);
    return {
      name: n.full_name,
      value: n.total_cases,
      symbolSize: symbolSize(n.total_cases),
      category: catIdx.get(region) ?? 0,
      // label only the very top firms (manual §13: top ~10 labelled)
      label: { show: n.total_cases >= shown[9]?.total_cases },
      _region: region,
      _sweet: n.sweet_spot_cases,
      _pct: n.pct_sweet_spot,
    };
  });

  const option = {
    tooltip: {
      formatter: (p: { data: { name: string; value: number; _region: string; _sweet: number; _pct: number } }) => {
        const d = p.data;
        return (
          `${d.name}<br/>${d.value.toLocaleString("en-GB")} prípadov` +
          `<br/>región: ${d._region}` +
          `<br/>sweet-spot 2016–19: ${d._sweet} (${d._pct}%)`
        );
      },
    },
    legend: {
      type: "scroll",
      bottom: 0,
      data: presentRegions,
      textStyle: { fontFamily: "JetBrains Mono", fontSize: 10, color: T.text2 },
      icon: "circle",
      itemWidth: 10,
      itemHeight: 10,
    },
    series: [
      {
        type: "graph",
        layout: "force",
        roam: true,
        draggable: false,
        categories,
        // NO links — there is no real edge data. Honest by construction.
        links: [],
        force: {
          repulsion: 70,
          gravity: 0.12,
          friction: 0.3,
          edgeLength: 40,
        },
        label: {
          position: "right",
          fontFamily: "JetBrains Mono",
          fontSize: 10,
          color: T.text,
          formatter: (p: { name: string }) => p.name.slice(0, 22),
        },
        emphasis: { focus: "self", scale: 1.1 },
        itemStyle: { borderColor: T.bg1, borderWidth: 1, opacity: 0.92 },
        data: nodes,
      },
    ],
  };

  return (
    <div>
      <ReactECharts option={option} theme="mano" style={{ height: 440 }} notMerge />
      <div className="chart-footnote">
        Uzly = IP firmy, veľkosť = počet prípadov, farba = región. <b>Bez hrán</b>{" "}
        — neexistuje žiadne MANO-case prepojenie ani reálny vzťah firma↔firma,
        takže žiadne nevymýšľame. Toto je <b>trhová štruktúra</b>, nie MANO
        referral sieť. Zobrazených top {TOP_N} z{" "}
        {data.nodes.length.toLocaleString("en-GB")} firiem (chvost = jednotky
        prípadov). Najväčší uzol: OR Nottingham (1 108). Zdroj: Gazette
        appointments agregované do IP firiem.
      </div>
    </div>
  );
}
