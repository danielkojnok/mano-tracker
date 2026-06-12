/* Global ECharts theme — DESIGN-MANUAL.md §07. Register once, use theme="mano". */
import * as echarts from "echarts";
import { T } from "../styles/tokens";

const mono = "JetBrains Mono";

export const manoTheme = {
  backgroundColor: "transparent",
  textStyle: { fontFamily: mono, fontSize: 11, color: T.text2 },
  grid: { top: 32, right: 24, bottom: 40, left: 56 },
  categoryAxis: {
    axisLine: { lineStyle: { color: T.border } },
    axisTick: { show: false },
    axisLabel: { fontFamily: mono, fontSize: 11, color: T.text2 },
    splitLine: { show: false },
  },
  timeAxis: {
    axisLine: { lineStyle: { color: T.border } },
    axisTick: { show: false },
    axisLabel: { fontFamily: mono, fontSize: 11, color: T.text2 },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { fontFamily: mono, fontSize: 11, color: T.text2 },
    splitLine: { lineStyle: { color: T.rowLine, type: "dotted" } },
  },
  legend: {
    bottom: 0,
    textStyle: { fontFamily: mono, fontSize: 11, color: T.text2 },
    itemWidth: 14,
    itemHeight: 8,
    icon: "rect",
  },
  tooltip: {
    backgroundColor: T.bg2,
    borderColor: T.borderStrong,
    borderWidth: 1,
    textStyle: { fontFamily: mono, fontSize: 11, color: T.text },
    axisPointer: { lineStyle: { color: T.goldDim, width: 1 } },
  },
};

echarts.registerTheme("mano", manoTheme);

export default echarts;
