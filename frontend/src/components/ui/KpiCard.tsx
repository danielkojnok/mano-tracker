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
  /** When set, appends an ⓘ to the sub-line with this text as a native tooltip. */
  subTooltip?: string;
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
  subTooltip,
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
        <div className={`kpi-sub mono${trend ? ` kpi-sub-${trend}` : ""}`}>
          {sub}
          {subTooltip && (
            <span className="kpi-info" title={subTooltip} aria-label={subTooltip}>
              {" "}ⓘ
            </span>
          )}
        </div>
      )}
    </div>
  );
}
