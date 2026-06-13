import ReactECharts from "echarts-for-react";
import "../../lib/echartsTheme";
import { T } from "../../styles/tokens";
import { useFetch } from "../../hooks/useData";
import type { PetitionsCvl } from "../../types/data";

/* Petitions vs liquidator appointments (monthly, from gazette). Winding-up
 * petitions are an EARLIER sub-signal: a petition precedes the eventual
 * compulsory liquidation / appointment by months. Honest framing — petitions
 * lead appointments, so a turn in petitions is a forward read on the
 * appointment trend. From petitions_cvl.json. */

function toTs(d: string): number {
  return new Date(d + "-01T00:00:00Z").getTime();
}

export default function PetitionsVsCvl() {
  const { data, loading, error } = useFetch<PetitionsCvl>("petitions_cvl.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 300 }} />;
  if (error || !data || data.series.length === 0)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const appts: [number, number][] = data.series.map((p) => [toTs(p.date), p.appointments]);
  const pets: [number, number][] = data.series.map((p) => [toTs(p.date), p.petitions]);

  const option = {
    tooltip: { trigger: "axis" },
    legend: {
      bottom: 0,
      data: ["LIKVIDÁCIE (appointments)", "PETÍCIE (winding-up)"],
      textStyle: { fontFamily: "JetBrains Mono", fontSize: 11, color: T.text2 },
    },
    grid: { top: 16, right: 24, bottom: 48, left: 48 },
    xAxis: { type: "time", axisLabel: { hideOverlap: true, fontSize: 11 } },
    yAxis: { type: "value", min: 0, axisLabel: { fontSize: 11 } },
    series: [
      {
        name: "LIKVIDÁCIE (appointments)",
        type: "line",
        data: appts,
        symbol: "none",
        lineStyle: { color: T.gold, width: 2 },
        itemStyle: { color: T.gold },
      },
      {
        name: "PETÍCIE (winding-up)",
        type: "line",
        data: pets,
        symbol: "none",
        lineStyle: { color: T.signal, width: 2 },
        itemStyle: { color: T.signal },
      },
    ],
  };

  return (
    <div>
      <ReactECharts option={option} theme="mano" style={{ height: 280 }} notMerge />
      <div className="chart-footnote">
        <b className="signal">Petície</b> (winding-up) predchádzajú{" "}
        <b className="gold">likvidáciám</b> (appointments) o niekoľko mesiacov —
        sú skorším sub-signálom budúcich compulsory likvidácií. Celkom{" "}
        {data.total_petitions.toLocaleString("en-GB")} petícií,{" "}
        {data.total_appointments.toLocaleString("en-GB")} likvidácií. Zdroj: The
        Gazette.
      </div>
    </div>
  );
}
