import { useState } from "react";
import ReactECharts from "echarts-for-react";
import "../../lib/echartsTheme";
import { T } from "../../styles/tokens";
import { useFetch } from "../../hooks/useData";
import type { InsolTimeseries } from "../../types/data";
import "./InsolvencyChart.css";

type Mode = "cvl" | "compulsory" | "both";

const MODES: { key: Mode; label: string }[] = [
  { key: "cvl", label: "CVL" },
  { key: "compulsory", label: "COMPULSORY" },
  { key: "both", label: "OBOJE" },
];

export default function InsolvencyChart() {
  const { data, loading, error } = useFetch<InsolTimeseries>(
    "insolvency_timeseries.json",
  );
  const [mode, setMode] = useState<Mode>("both");

  if (loading) return <div className="chart-skeleton" aria-hidden="true" />;
  if (error || !data)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const cvl: [string, number][] = data.series.map((p) => [p.date, p.cvl]);
  const compulsory: [string, number][] = data.series.map((p) => [
    p.date,
    p.compulsory,
  ]);

  const option = {
    tooltip: { trigger: "axis" },
    legend: {
      bottom: 0,
      selected: {
        CVL: mode !== "compulsory",
        COMPULSORY: mode !== "cvl",
      },
    },
    grid: { top: 32, right: 24, bottom: 64, left: 56 },
    xAxis: {
      type: "time",
      axisLabel: { hideOverlap: true }, // Law 7
    },
    yAxis: { type: "value" },
    series: [
      {
        name: "CVL",
        type: "line",
        data: cvl,
        symbol: "none",
        lineStyle: { color: T.gold, width: 1.5 },
        itemStyle: { color: T.gold },
        sampling: "lttb",
      },
      {
        name: "COMPULSORY",
        type: "line",
        data: compulsory,
        symbol: "none",
        lineStyle: { color: T.signal, width: 1.5 },
        itemStyle: { color: T.signal },
        sampling: "lttb",
      },
    ],
  };

  return (
    <div>
      <div className="chart-toggle mono">
        {MODES.map((m) => (
          <button
            key={m.key}
            className={`toggle-btn${mode === m.key ? " toggle-active" : ""}`}
            onClick={() => setMode(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <ReactECharts option={option} theme="mano" style={{ height: 360 }} notMerge />
    </div>
  );
}
