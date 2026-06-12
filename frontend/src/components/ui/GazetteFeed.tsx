import { useFetch } from "../../hooks/useData";
import type { GazetteRecent } from "../../types/data";
import Tag from "./Tag";
import "./GazetteFeed.css";

const ellipsis = (s: string, n = 28) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function tagVariant(displayType: string): "gold" | "signal" | "neutral" {
  if (displayType === "LIKVIDÁCIA") return "gold";
  if (displayType === "PETÍCIA") return "signal";
  return "neutral";
}

export default function GazetteFeed() {
  const { data, loading, error } = useFetch<GazetteRecent>("gazette_recent.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 240 }} />;
  if (error || !data)
    return <div className="chart-error mono">CHYBA · FEED NEDOSTUPNÝ</div>;

  return (
    <div className="gazette-feed">
      {data.notices.slice(0, 20).map((n, i) => (
        <div className="gazette-row" key={`${n.date}-${i}`}>
          <span className="mono gazette-date">{n.date}</span>
          {/* Law 4 — ellipsis 28ch, full name in title */}
          <span className="gazette-name" title={n.company_name}>
            {ellipsis(n.company_name)}
          </span>
          <Tag variant={tagVariant(n.display_type)}>{n.display_type}</Tag>
        </div>
      ))}
    </div>
  );
}
