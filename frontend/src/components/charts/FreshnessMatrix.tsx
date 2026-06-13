import { useFetch } from "../../hooks/useData";
import type { Freshness, FreshnessSource } from "../../types/data";
import { T } from "../../styles/tokens";
import "./FreshnessMatrix.css";

/* Freshness matrix (manual §21) — each data source with last-updated, row
 * count, status dot, and a volume sparkline. From freshness.json (real row
 * counts + max dates from tracker.db metadata).
 *
 * Two honesty rules applied at render (derived from the data, not hardcoded):
 *   - a feed whose latest data point is materially old is shown AMBER (the
 *     Insolvency Service feed is the core thesis input, so staleness matters);
 *   - a sparkline is drawn ONLY for rows that carry a real time series; rows
 *     that are snapshots / irregular / the model show "—" + a one-word reason
 *     (never a fabricated line). */

// staleness threshold for feed data, in days
const STALE_DAYS = 60;

function Sparkline({ data }: { data: number[] }) {
  const W = 96;
  const H = 22;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / span) * (H - 3) - 1.5;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className="fm-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={T.goldDim} strokeWidth={1.2} />
    </svg>
  );
}

// Why a row legitimately has no 12M series (so we show a reason, not a line).
function noSeriesReason(name: string): string {
  if (name.toLowerCase().includes("pipeline")) return "model";
  if (name.toLowerCase().includes("rns")) return "nepravidelné";
  if (name.toLowerCase().includes("enrichment")) return "snapshot";
  return "bez série";
}

// Days between an ISO date string and now; null if unparseable.
function ageDays(last: string | null): number | null {
  if (!last) return null;
  const t = Date.parse(last);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

interface RowState {
  status: string;
  note: string | null;
}

// Derive the effective status (may upgrade "ok" → "warn" for a stale feed).
function rowState(s: FreshnessSource): RowState {
  const hasSeries = s.spark.length >= 2; // only feeds with a real series
  const age = ageDays(s.last);
  // Only feeds (rows that carry a series) can go stale; snapshots/model don't.
  if (s.status === "ok" && hasSeries && age != null && age > STALE_DAYS) {
    const months = (age / 30).toFixed(1);
    const isThesisInput = s.name.toLowerCase().includes("insolvency");
    return {
      status: "warn",
      note: isThesisInput
        ? `vstup tézy · ~${months}m starý`
        : `~${months}m starý`,
    };
  }
  return { status: s.status, note: null };
}

export default function FreshnessMatrix() {
  const { data, loading, error } = useFetch<Freshness>("freshness.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 240 }} />;
  if (error || !data)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const dotColor = (status: string) =>
    status === "ok" ? T.up : status === "warn" ? T.warn : T.down;

  return (
    <table className="fm-table mono">
      <thead>
        <tr>
          <th>ZDROJ</th>
          <th>DETAIL</th>
          <th className="num">RIADKY</th>
          <th>POSLEDNÝ</th>
          <th>OBJEM 12M</th>
          <th className="fm-status-h">STAV</th>
        </tr>
      </thead>
      <tbody>
        {data.sources.map((s) => {
          const { status, note } = rowState(s);
          const hasSeries = s.spark.length >= 2;
          return (
            <tr key={s.name}>
              <td className="fm-name">{s.name}</td>
              <td className="fm-detail">
                {s.detail}
                {note && <span className="fm-note"> · {note}</span>}
              </td>
              <td className="num">{s.rows != null ? s.rows.toLocaleString("en-GB") : "—"}</td>
              <td className="num">{s.last ?? "—"}</td>
              <td>
                {hasSeries ? (
                  <Sparkline data={s.spark} />
                ) : (
                  <span className="fm-nospark mono">— {noSeriesReason(s.name)}</span>
                )}
              </td>
              <td className="fm-status">
                <span className="fm-dot" style={{ background: dotColor(status) }} />
                {status === "ok" ? "OK" : status.toUpperCase()}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
