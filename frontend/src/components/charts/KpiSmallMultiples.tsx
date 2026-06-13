import { useFetch } from "../../hooks/useData";
import type { ManoKpis, ManoFy } from "../../types/data";
import { T } from "../../styles/tokens";
import "./KpiSmallMultiples.css";

/* KPI small-multiples (manual §06) — a grid of mini bar charts FY19–FY26, one
 * per metric, EACH scaled to its own metric. From mano_kpis.json (no model
 * number). The latest bar (FY26) is gold to anchor "now". */

interface Metric {
  key: string;
  title: string;
  unit: string;
  get: (f: ManoFy) => number | null;
  fmt: (v: number) => string;
}

const METRICS: Metric[] = [
  {
    key: "realised",
    title: "REALISED REVENUE",
    unit: "£m",
    get: (f) => f.realised_m,
    fmt: (v) => `£${v.toFixed(1)}m`,
  },
  {
    key: "completions",
    title: "UKONČENIA",
    unit: "počet",
    get: (f) => f.completions,
    fmt: (v) => `${v}`,
  },
  {
    key: "arrcc",
    title: "ARRCC",
    unit: "£k/prípad",
    get: (f) => f.arrcc_k,
    fmt: (v) => `£${v}k`,
  },
  {
    key: "roi",
    title: "REALISED ROI",
    unit: "%",
    get: (f) => f.roi_pct,
    fmt: (v) => `${v}%`,
  },
];

function MiniBars({ series, metric }: { series: ManoFy[]; metric: Metric }) {
  const vals = series.map((f) => metric.get(f));
  const present = vals.filter((v): v is number => v != null);
  const max = present.length ? Math.max(...present) : 1;

  const W = 240;
  const H = 96;
  const PAD_B = 18;
  const PAD_T = 6;
  const n = series.length;
  const slot = W / n;
  const barW = slot * 0.62;

  // latest period with a value → gold
  const lastIdx = (() => {
    for (let i = n - 1; i >= 0; i--) if (vals[i] != null) return i;
    return -1;
  })();

  return (
    <div className="sm-cell">
      <div className="sm-head">
        <span className="sm-title">{metric.title}</span>
        <span className="sm-unit mono">{metric.unit}</span>
      </div>
      <svg className="sm-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {series.map((f, i) => {
          const v = vals[i];
          const x = i * slot + (slot - barW) / 2;
          if (v == null) {
            return (
              <text
                key={f.fy}
                x={i * slot + slot / 2}
                y={H - PAD_B - 4}
                className="sm-na mono"
                textAnchor="middle"
              >
                –
              </text>
            );
          }
          const h = Math.max(2, ((v / max) * (H - PAD_B - PAD_T)));
          const y = H - PAD_B - h;
          const isLast = i === lastIdx;
          return (
            <g key={f.fy}>
              <rect x={x} y={y} width={barW} height={h} fill={isLast ? T.gold : T.signal} opacity={isLast ? 1 : 0.75} />
            </g>
          );
        })}
        {/* x labels every other year to avoid clutter (law 7: no rotation) */}
        {series.map((f, i) => (
          <text
            key={`l-${f.fy}`}
            x={i * slot + slot / 2}
            y={H - 4}
            className="sm-xlabel mono"
            textAnchor="middle"
          >
            {i % 2 === 0 ? f.fy.replace("FY", "") : ""}
          </text>
        ))}
      </svg>
      <div className="sm-foot mono">
        {lastIdx >= 0 && vals[lastIdx] != null ? (
          <>
            {series[lastIdx].fy}: <b>{metric.fmt(vals[lastIdx] as number)}</b>
          </>
        ) : (
          "—"
        )}
      </div>
    </div>
  );
}

export default function KpiSmallMultiples() {
  const { data, loading, error } = useFetch<ManoKpis>("mano_kpis.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 240 }} />;
  if (error || !data)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  return (
    <div className="sm-grid">
      {METRICS.map((m) => (
        <MiniBars key={m.key} series={data.fy_series} metric={m} />
      ))}
    </div>
  );
}
