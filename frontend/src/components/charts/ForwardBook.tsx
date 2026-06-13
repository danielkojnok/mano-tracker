import ReactECharts from "echarts-for-react";
import "../../lib/echartsTheme";
import { T } from "../../styles/tokens";
import { useFetch } from "../../hooks/useData";
import type { Valuation } from "../../types/data";
import "./ForwardBook.css";

/* Forward book composition — £67m total split large £32m (48%) / small £35m
 * (52%), with the 282 active investments noted. Donut from valuation.json.
 * The small split is derived as total − large (a definitional identity, not a
 * model assumption). */

export default function ForwardBook() {
  const { data, loading, error } = useFetch<Valuation>("valuation.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 240 }} />;
  if (error || !data)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const total = data.forward_book_m;
  const large = data.large_cases_m;
  const small = Math.round((total - large) * 10) / 10;
  const largePct = data.large_cases_pct;
  const smallPct = 100 - largePct;

  const option = {
    tooltip: {
      trigger: "item",
      formatter: (p: { name: string; value: number; percent: number }) =>
        `${p.name}<br/>£${p.value}m · ${p.percent}%`,
    },
    series: [
      {
        type: "pie",
        radius: ["52%", "78%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: T.bg1, borderWidth: 2 },
        label: {
          show: true,
          position: "outside",
          fontFamily: "JetBrains Mono",
          fontSize: 11,
          color: T.text2,
          formatter: (p: { name: string; value: number }) => `${p.name}\n£${p.value}m`,
        },
        labelLine: { length: 12, length2: 12, lineStyle: { color: T.border } },
        data: [
          { name: "VEĽKÉ PRÍPADY", value: large, itemStyle: { color: T.gold } },
          { name: "MALÉ PRÍPADY", value: small, itemStyle: { color: T.signal } },
        ],
      },
    ],
    graphic: {
      type: "group",
      left: "center",
      top: "center",
      children: [
        {
          type: "text",
          style: {
            text: `£${total}m`,
            fontFamily: "JetBrains Mono",
            fontSize: 26,
            fontWeight: 700,
            fill: T.text,
            textAlign: "center",
          },
          top: -14,
          left: -2,
        },
        {
          type: "text",
          style: {
            text: "FORWARD BOOK",
            fontFamily: "JetBrains Mono",
            fontSize: 10,
            fill: T.text2,
            textAlign: "center",
          },
          top: 16,
          left: -2,
        },
      ],
    },
  };

  return (
    <div className="fbook">
      <ReactECharts option={option} theme="mano" style={{ height: 240 }} notMerge />
      <div className="fbook-legend mono">
        <div className="fbook-row">
          <span className="fbook-sq" style={{ background: T.gold }} />
          VEĽKÉ <b>£{large}m</b> ({largePct}%)
        </div>
        <div className="fbook-row">
          <span className="fbook-sq" style={{ background: T.signal }} />
          MALÉ <b>£{small}m</b> ({smallPct}%)
        </div>
        <div className="fbook-row fbook-active">
          {data.active_investments} aktívnych investícií · +37% YoY
        </div>
      </div>
    </div>
  );
}
