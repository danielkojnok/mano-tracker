import "./KpiCard.css";

interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  trend?: "up" | "down" | null;
  isKeyMetric?: boolean;
  /** Set true when value is a word-state (e.g. "Klesá") — value then takes semantic trend color. */
  wordState?: boolean;
}

/** KPI card — DESIGN-MANUAL.md §06: 4 visual states. */
export default function KpiCard({
  label,
  value,
  unit,
  sub,
  trend = null,
  isKeyMetric = false,
  wordState = false,
}: KpiCardProps) {
  const valueClass = [
    "kpi-value",
    "mono",
    isKeyMetric ? "kpi-value-key" : "",
    wordState && trend ? `kpi-value-${trend}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`kpi-card${isKeyMetric ? " kpi-card-key" : ""}`}>
      <div className="kpi-label mono">{label}</div>
      <div className={valueClass}>
        {value}
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      {sub && (
        <div className={`kpi-sub mono${trend ? ` kpi-sub-${trend}` : ""}`}>{sub}</div>
      )}
    </div>
  );
}
