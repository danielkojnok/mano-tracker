import ReactECharts from "echarts-for-react";
import "../../lib/echartsTheme";
import { T } from "../../styles/tokens";
import { useFetch } from "../../hooks/useData";
import type { ValuationBridge as VB, BridgeRow } from "../../types/data";
import { ASSUMPTION_NOTES } from "../../data/valuationBridge";
import "./ValuationBridge.css";

/* Model → valuation bridge (THE PAYOFF). For each scenario, the transparent
 * chain revenue → PBT → net → EPS → implied price, then a bar comparing the
 * three base-margin implied prices to current 39.3p (gold) and Singer 130p
 * (green), with the low/high-MARGIN range drawn as an error band — because the
 * margin assumption is the key swing. All numbers from valuation_bridge.json
 * (model/pipeline.py); assumptions echoed from valuationBridge.ts and labelled
 * as assumptions, not facts. */

const SCEN_LABEL: Record<BridgeRow["scenario"], string> = {
  bear: "PESIMISTICKÝ",
  base: "ZÁKLADNÝ",
  bull: "OPTIMISTICKÝ",
};

export default function ValuationBridge() {
  const { data, loading, error } = useFetch<VB>("valuation_bridge.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 420 }} />;
  if (error || !data)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const cats = data.rows.map((r) => SCEN_LABEL[r.scenario]);
  const basePrices = data.rows.map((r) => r.base.price_p);
  // error band: low-margin → high-margin price per scenario
  const errLow = data.rows.map((r) => r.low.price_p);
  const errHigh = data.rows.map((r) => r.high.price_p);

  const a = data.assumptions;
  const marginBasePct = Math.round(a.pbt_margin_base * 100);
  const marginLowPct = Math.round(a.pbt_margin_low * 100);
  const marginHighPct = Math.round(a.pbt_margin_high * 100);

  const maxP = Math.max(...errHigh, data.singer_target_p) * 1.08;

  const option = {
    grid: { top: 28, right: 24, bottom: 28, left: 48 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: { dataIndex: number }[]) => {
        const i = params[0].dataIndex;
        const r = data.rows[i];
        return (
          `${SCEN_LABEL[r.scenario]} · tržba £${r.revenue_m}m<br/>` +
          `@${marginBasePct}% marža: <b>${r.base.price_p}p</b> (${r.base.upside_pct > 0 ? "+" : ""}${r.base.upside_pct}%)<br/>` +
          `@${marginLowPct}% marža: ${r.low.price_p}p<br/>` +
          `@${marginHighPct}% marža: ${r.high.price_p}p`
        );
      },
    },
    xAxis: {
      type: "category",
      data: cats,
      axisLabel: { fontSize: 11, color: T.text2 },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: maxP,
      axisLabel: { fontSize: 11, formatter: "{value}p" },
    },
    series: [
      {
        name: `Implik. cena @${marginBasePct}% marža`,
        type: "bar",
        data: basePrices,
        barWidth: "46%",
        itemStyle: { color: T.signal },
        label: {
          show: true,
          position: "top",
          formatter: (p: { value: number }) => `${p.value}p`,
          fontFamily: "JetBrains Mono",
          fontSize: 12,
          fontWeight: 700,
          color: T.text,
        },
        markLine: {
          symbol: "none",
          silent: true,
          data: [
            {
              yAxis: data.current_price_p,
              lineStyle: { color: T.gold, width: 2, type: "solid" as const },
              label: {
                formatter: `DNES ${data.current_price_p}p`,
                position: "insideEndTop" as const,
                fontFamily: "JetBrains Mono",
                fontSize: 11,
                color: T.gold,
              },
            },
            {
              yAxis: data.singer_target_p,
              lineStyle: { color: T.up, width: 2, type: "dashed" as const },
              label: {
                formatter: `SINGER ${data.singer_target_p}p`,
                position: "insideEndTop" as const,
                fontFamily: "JetBrains Mono",
                fontSize: 11,
                color: T.up,
              },
            },
          ],
        },
      },
      // margin sensitivity band (low↔high margin) as a custom error bar.
      {
        name: `Rozsah marže ${marginLowPct}–${marginHighPct}%`,
        type: "custom",
        renderItem: (
          params: { dataIndex: number },
          api: {
            value: (i: number) => number;
            coord: (p: [number, number]) => [number, number];
            size: (p: [number, number]) => [number, number];
            style: () => Record<string, unknown>;
          },
        ) => {
          const i = params.dataIndex;
          const xVal = api.value(0);
          const lowP = errLow[i];
          const highP = errHigh[i];
          const [x, yLow] = api.coord([xVal, lowP]);
          const [, yHigh] = api.coord([xVal, highP]);
          const half = 14;
          const line = (yy: number, w: number) => ({
            type: "line",
            shape: { x1: x - w, y1: yy, x2: x + w, y2: yy },
            style: { stroke: T.text2, lineWidth: 1.5 },
          });
          return {
            type: "group",
            children: [
              {
                type: "line",
                shape: { x1: x, y1: yLow, x2: x, y2: yHigh },
                style: { stroke: T.text2, lineWidth: 1.5 },
              },
              line(yLow, half),
              line(yHigh, half),
            ],
          };
        },
        data: data.rows.map((r) => [SCEN_LABEL[r.scenario], r.base.price_p]),
        encode: { x: 0, y: 1 },
        z: 5,
        tooltip: { show: false },
      },
    ],
  };

  return (
    <div>
      {/* per-scenario chain rows */}
      <table className="bridge-table mono">
        <thead>
          <tr>
            <th>SCENÁR</th>
            <th className="num">TRŽBA</th>
            <th className="num">PBT (×{marginBasePct}%)</th>
            <th className="num">NET (×{Math.round((1 - a.tax_rate) * 100)}%)</th>
            <th className="num">EPS</th>
            <th className="num">CENA (×{a.pe_multiple})</th>
            <th className="num">UPSIDE</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.scenario} className={r.scenario === "base" ? "bridge-base" : ""}>
              <td>{SCEN_LABEL[r.scenario]}</td>
              <td className="num">£{r.revenue_m}m</td>
              <td className="num">£{r.base.pbt_m}m</td>
              <td className="num">£{r.base.net_m}m</td>
              <td className="num">{r.base.eps_p}p</td>
              <td className="num gold">{r.base.price_p}p</td>
              <td className={`num ${r.base.upside_pct >= 0 ? "up" : "down"}`}>
                {r.base.upside_pct >= 0 ? "+" : ""}
                {r.base.upside_pct}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ReactECharts option={option} theme="mano" style={{ height: 300 }} notMerge />

      <div className="bridge-caption">
        <p>
          Citlivosť na maržu je kľúčová. Pri <b>{marginBasePct}% PBT marži</b> base
          scenár implikuje <b className="gold">{data.rows[1].base.price_p}p</b> —
          nad Singer cieľom {data.singer_target_p}p. Pri konzervatívnej{" "}
          <b>{marginLowPct}% marži</b> klesne na{" "}
          <b>{data.rows[1].low.price_p}p</b>, stále{" "}
          <b className="up">+{data.rows[1].low.upside_pct}%</b> nad cenou{" "}
          {data.current_price_p}p. Upside je reálny, ale závisí od{" "}
          <b>normalizácie marže</b> (FY26 ~6.8% deprimovaná debtor delays). Chybové
          úsečky = rozsah marže {marginLowPct}–{marginHighPct}%.
        </p>
        <div className="bridge-assumptions">
          <span className="ba-tag mono">PREDPOKLADY (nie predpoveď):</span>
          {ASSUMPTION_NOTES.map((n) => (
            <span key={n.label} className="ba-item mono" title={n.why}>
              {n.label} <b>{n.value}</b> ⓘ
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
