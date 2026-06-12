import "./KpiCard.css";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | null;
  isKeyMetric?: boolean;
}

/** KPI card — DESIGN-MANUAL.md §06: 4 visual states. */
export default function KpiCard({
  label,
  value,
  sub,
  trend = null,
  isKeyMetric = false,
}: KpiCardProps) {
  const valueClass = [
    "kpi-value",
    "mono",
    isKeyMetric ? "kpi-value-key" : "",
    !isKeyMetric && trend ? `kpi-value-${trend}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`kpi-card${isKeyMetric ? " kpi-card-key" : ""}`}>
      <div className="kpi-label mono">{label}</div>
      <div className={valueClass}>{value}</div>
      {sub && (
        <div className={`kpi-sub mono${trend ? ` kpi-sub-${trend}` : ""}`}>{sub}</div>
      )}
    </div>
  );
}
