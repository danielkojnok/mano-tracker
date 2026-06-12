import type { ReactNode } from "react";
import "./Panel.css";

interface PanelProps {
  title: string;
  source: string; // REQUIRED — every panel declares its data source
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
      <footer className="panel-footer mono">Zdroj: {source}</footer>
    </section>
  );
}
