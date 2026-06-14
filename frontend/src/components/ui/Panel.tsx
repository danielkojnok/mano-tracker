import type { ReactNode } from "react";
import "./Panel.css";

interface PanelProps {
  title: string;
  /** Data source for the footer. Omit ONLY when the panel renders its own
   *  source line inside the body (e.g. the IP map keeps the source under the
   *  map per PART 7) — every panel still declares its source somewhere. */
  source?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

/** Universal panel — DESIGN-MANUAL.md §05: three zones, two 1px lines. */
export default function Panel({ title, source, headerRight, children }: PanelProps) {
  return (
    <section className="panel">
      <header className="panel-header">
        <span className="panel-square" aria-hidden="true" />
        <h2 className="panel-title">{title}</h2>
        {headerRight && <div className="panel-header-right mono">{headerRight}</div>}
      </header>
      <div className="panel-body">{children}</div>
      {source && <footer className="panel-footer mono">Zdroj: {source}</footer>}
    </section>
  );
}
