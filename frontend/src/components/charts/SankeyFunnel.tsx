import ReactECharts from "echarts-for-react";
import "../../lib/echartsTheme";
import { T } from "../../styles/tokens";
import { useFetch } from "../../hooks/useData";
import type { ThesisFlow } from "../../types/data";

/* Téza ako lievik — model funnel (manual §14). Cyan flows, final flow
 * to TRŽBY node gold. Flow width uses sqrt scale so the 27k→38 collapse
 * stays legible; true values shown in node labels. */

const fmt = (n: number) =>
  n >= 1000 ? n.toLocaleString("en-GB") : n.toFixed(n % 1 === 0 ? 0 : 1);

export default function SankeyFunnel() {
  const { data, loading, error } = useFetch<ThesisFlow>("thesis_flow.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 360 }} />;
  if (error || !data)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const stages = data.stages;
  const lastIdx = stages.length - 1;

  const nodes = stages.map((s, i) => ({
    name: s.name,
    itemStyle: {
      color: i === lastIdx ? T.gold : T.signal,
      borderColor: "transparent",
    },
  }));

  // links chain consecutive stages; width = sqrt(target value) for readability
  const links = stages.slice(0, -1).map((s, i) => {
    const target = stages[i + 1];
    return {
      source: s.name,
      target: target.name,
      value: Math.sqrt(target.value),
      lineStyle: {
        color: i === lastIdx - 1 ? T.gold : T.signal,
        opacity: 0.35,
      },
    };
  });

  const labelValue: Record<string, number> = Object.fromEntries(
    stages.map((s) => [s.name, s.value]),
  );

  const option = {
    series: [
      {
        type: "sankey",
        left: 8,
        right: 96,
        top: 16,
        bottom: 16,
        nodeWidth: 14,
        nodeGap: 14,
        draggable: false,
        data: nodes,
        links,
        label: {
          fontFamily: "JetBrains Mono",
          fontSize: 12,
          color: T.text,
          formatter: (p: { name: string }) =>
            `${p.name}  ${fmt(labelValue[p.name])}`,
        },
        lineStyle: { curveness: 0.5 },
      },
    ],
    tooltip: {
      trigger: "item",
      formatter: (p: { name?: string; dataType?: string }) =>
        p.dataType === "node" && p.name
          ? `${p.name}: ${fmt(labelValue[p.name])}`
          : "",
    },
  };

  return <ReactECharts option={option} theme="mano" style={{ height: 360 }} notMerge />;
}
