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
  /** When true, show an honest caption naming the first FY that has data
   *  (this metric is sparsely populated in the source — no fabrication). */
  explainSparse?: boolean;
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
    // ROI per year is null for FY19–FY23 in the source (MANO disclosed annual
    // realised ROI only from FY24); we show the honest empty stub + a caption,
    // never invented numbers.
    explainSparse: true,
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

  // Emphasis is anchored to the SAME period across every metric: the latest
  // fiscal year in the dataset (the rightmost slot = "now"). A bar is gold only
  // when it is that period AND has a value. Metrics whose latest period is null
  // (e.g. ROI has no FY26) simply show no gold bar — they never borrow a
  // different year's emphasis, so all four charts read consistently.
  const currentIdx = n - 1;

  // Latest period that actually HAS a value — used only for the footer caption
  // (so an all-recent-null metric still reports its most recent figure).
  const lastWithValueIdx = (() => {
    for (let i = n - 1; i >= 0; i--) if (vals[i] != null) return i;
    return -1;
  })();

  // First period with a value — used for the honest "disclosed only from FYxx"
  // caption on sparsely-populated metrics (e.g. ROI). Derived from the data.
  const firstWithValueIdx = vals.findIndex((v) => v != null);
  const sparseCaption =
    metric.explainSparse && firstWithValueIdx > 0
      ? `ROI per rok zverejnené až od ${series[firstWithValueIdx].fy}`
      : null;

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
          const baseY = H - PAD_B;
          if (v == null) {
            // No-data year: a faint baseline stub instead of a lonely "–", so
            // early years read as "no data" without looking like broken bars.
            return (
              <rect
                key={f.fy}
                x={x}
                y={baseY - 2}
                width={barW}
                height={2}
                className="sm-bar-empty"
              />
            );
          }
          const h = Math.max(2, ((v / max) * (H - PAD_B - PAD_T)));
          const y = baseY - h;
          const isCurrent = i === currentIdx;
          return (
            <rect
              key={f.fy}
              x={x}
              y={y}
              width={barW}
              height={h}
              fill={isCurrent ? T.gold : T.signal}
              opacity={isCurrent ? 1 : 0.75}
            />
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
        {lastWithValueIdx >= 0 ? (
          <>
            {series[lastWithValueIdx].fy}:{" "}
            <b>{metric.fmt(vals[lastWithValueIdx] as number)}</b>
          </>
        ) : (
          "—"
        )}
      </div>
      {sparseCaption && <div className="sm-sparse mono">{sparseCaption}</div>}
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
