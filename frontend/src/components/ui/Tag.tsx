import "./Tag.css";

interface TagProps {
  children: string;
  variant?: "gold" | "signal" | "up" | "down" | "warn" | "neutral";
}

/** Tag — DESIGN-MANUAL.md §06: radius 2px, 1px border, mono 11px, uppercase. */
export default function Tag({ children, variant = "neutral" }: TagProps) {
  return <span className={`tag mono tag-${variant}`}>{children}</span>;
}
