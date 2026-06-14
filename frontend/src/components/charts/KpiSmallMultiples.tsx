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
  /** When true, render ONLY the fiscal years that actually have a value (drop
   *  the empty ones) plus a fixed honest caption — used for ROI, which MANO
   *  discloses per-year only for FY24/FY25. Bars are styled uniformly (no
   *  "current year" gold emphasis) so no single year is singled out. */
  disclosedOnly?: boolean;
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
    // MANO discloses annual realised ROI only for FY24/FY25 (FY19–23 and FY26
    // have no figure). Show ONLY those two years + an honest caption — never
    // invented numbers, and no single year singled out by emphasis.
    disclosedOnly: true,
  },
];

function MiniBars({ series, metric }: { series: ManoFy[]; metric: Metric }) {
  // disclosedOnly metrics (ROI) drop the empty years entirely so the chart shows
  // only real disclosed data — no zero/empty columns, no fabrication.
  const display = metric.disclosedOnly
    ? series.filter((f) => metric.get(f) != null)
    : series;

  const vals = display.map((f) => metric.get(f));
  const present = vals.filter((v): v is number => v != null);
  const max = present.length ? Math.max(...present) : 1;

  const W = 240;
  const H = 96;
  const PAD_B = 18;
  const PAD_T = 6;
  const n = display.length;
  const slot = W / n;
  const barW = slot * 0.62;

  // Emphasis (gold "current" bar) is anchored to the latest fiscal year — but
  // only for the normal full-series metrics. disclosedOnly metrics style every
  // bar identically (gold-dim) so no single year (e.g. FY25) is singled out.
  const currentIdx = n - 1;

  // Latest period that actually HAS a value — used for the footer caption.
  const lastWithValueIdx = (() => {
    for (let i = n - 1; i >= 0; i--) if (vals[i] != null) return i;
    return -1;
  })();

  // Fixed honest caption for disclosedOnly (ROI): lists exactly the disclosed
  // years + values, read from the data (not hardcoded).
  const disclosedCaption = metric.disclosedOnly
    ? `ROI za jednotlivé roky je zverejnené len pre ${display
        .map((f) => `${f.fy} (${metric.get(f)} %)`)
        .join(" a ")}; skoršie roky MANO neudáva.`
    : null;

  return (
    <div className="sm-cell">
      <div className="sm-head">
        <span className="sm-title">{metric.title}</span>
        <span className="sm-unit mono">{metric.unit}</span>
      </div>
      <svg className="sm-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {display.map((f, i) => {
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
          // disclosedOnly → uniform gold-dim (no year singled out); otherwise the
          // latest year is gold, the rest signal at reduced opacity.
          const fill = metric.disclosedOnly
            ? T.goldDim
            : isCurrent
              ? T.gold
              : T.signal;
          const opacity = metric.disclosedOnly ? 1 : isCurrent ? 1 : 0.75;
          return (
            <rect key={f.fy} x={x} y={y} width={barW} height={h} fill={fill} opacity={opacity} />
          );
        })}
        {/* x labels: all years when few (disclosedOnly), else every other
            (law 7: no rotation) */}
        {display.map((f, i) => (
          <text
            key={`l-${f.fy}`}
            x={i * slot + slot / 2}
            y={H - 4}
            className="sm-xlabel mono"
            textAnchor="middle"
          >
            {metric.disclosedOnly || i % 2 === 0 ? f.fy.replace("FY", "") : ""}
          </text>
        ))}
      </svg>
      <div className="sm-foot mono">
        {lastWithValueIdx >= 0 ? (
          <>
            {display[lastWithValueIdx].fy}:{" "}
            <b>{metric.fmt(vals[lastWithValueIdx] as number)}</b>
          </>
        ) : (
          "—"
        )}
      </div>
      {disclosedCaption && <div className="sm-sparse mono">{disclosedCaption}</div>}
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
