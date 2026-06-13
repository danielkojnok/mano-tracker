import { useFetch } from "../../hooks/useData";
import type { Freshness } from "../../types/data";
import { T } from "../../styles/tokens";
import "./FreshnessMatrix.css";

/* Freshness matrix (manual §21) — each data source with last-updated, row
 * count, status dot, and a volume sparkline. From freshness.json (real row
 * counts + max dates from tracker.db metadata). */

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return <span className="fm-nospark mono">—</span>;
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
        {data.sources.map((s) => (
          <tr key={s.name}>
            <td className="fm-name">{s.name}</td>
            <td className="fm-detail">{s.detail}</td>
            <td className="num">{s.rows != null ? s.rows.toLocaleString("en-GB") : "—"}</td>
            <td className="num">{s.last ?? "—"}</td>
            <td>
              <Sparkline data={s.spark} />
            </td>
            <td className="fm-status">
              <span className="fm-dot" style={{ background: dotColor(s.status) }} />
              {s.status === "ok" ? "OK" : s.status.toUpperCase()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
