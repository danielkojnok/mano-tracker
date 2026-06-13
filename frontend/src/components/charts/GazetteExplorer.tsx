import { useMemo, useRef, useState } from "react";
import { useFetch } from "../../hooks/useData";
import type { GazetteExplorer as GE } from "../../types/data";
import "./GazetteExplorer.css";

/* Virtualized gazette explorer (137,960 total). We ship the most recent ~30k
 * rows as compact columnar JSON (≤10MB) and render only the VISIBLE rows via a
 * windowed list — so the DOM holds a few dozen rows regardless of dataset size.
 *
 * HONEST LABELLING: the header states the TRUE total and exactly how many are
 * loaded ("zobrazené posledných N z 137,960"). Filters narrow the loaded set;
 * we never imply we're showing all 137k. notice_type and company_name are real
 * (company_number is bugged and never used). */

const ROW_H = 32;
const OVERSCAN = 8;
const VIEWPORT_H = 420;

const TYPE_VARIANT = ["gold", "signal", "neutral"]; // index = type code

export default function GazetteExplorer() {
  const { data, loading, error } = useFetch<GE>("gazette_explorer.json");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<number | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build filtered index list (indices into the columnar arrays) — cheap, no
  // object allocation per row until render.
  const filtered = useMemo(() => {
    if (!data) return [] as number[];
    const { date, name, type } = data.columns;
    const q = query.trim().toUpperCase();
    const out: number[] = [];
    for (let i = 0; i < name.length; i++) {
      if (typeFilter !== "all" && type[i] !== typeFilter) continue;
      if (from && date[i] < from) continue;
      if (to && date[i] > to) continue;
      if (q && !name[i].toUpperCase().includes(q)) continue;
      out.push(i);
    }
    return out;
  }, [data, query, typeFilter, from, to]);

  if (loading) return <div className="chart-skeleton" style={{ height: 480 }} />;
  if (error || !data)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const { date, name, type } = data.columns;
  const total = filtered.length;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const endIdx = Math.min(total, Math.ceil((scrollTop + VIEWPORT_H) / ROW_H) + OVERSCAN);
  const visible = filtered.slice(startIdx, endIdx);

  return (
    <div className="ge">
      <div className="ge-controls">
        <input
          className="ge-input mono"
          placeholder="Hľadať názov firmy…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="ge-select mono"
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value === "all" ? "all" : Number(e.target.value))
          }
        >
          <option value="all">Všetky typy</option>
          {data.type_labels.map((lbl, i) => (
            <option key={lbl} value={i}>
              {lbl}
            </option>
          ))}
        </select>
        <input
          className="ge-date mono"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          title="Od dátumu"
        />
        <input
          className="ge-date mono"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          title="Do dátumu"
        />
      </div>

      <div className="ge-count mono">
        {total.toLocaleString("en-GB")} výsledkov · zobrazené posledných{" "}
        {data.shown.toLocaleString("en-GB")} z{" "}
        <b>{data.total.toLocaleString("en-GB")}</b> oznámení (nie celý dataset)
      </div>

      <div className="ge-head mono">
        <span className="ge-c-date">DÁTUM</span>
        <span className="ge-c-name">FIRMA</span>
        <span className="ge-c-type">TYP</span>
      </div>

      <div
        className="ge-viewport"
        ref={scrollRef}
        style={{ height: VIEWPORT_H }}
        onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      >
        <div style={{ height: total * ROW_H, position: "relative" }}>
          {visible.map((rowIdx, k) => {
            const top = (startIdx + k) * ROW_H;
            const tc = type[rowIdx];
            return (
              <div
                className="ge-row"
                key={rowIdx}
                style={{ top, height: ROW_H }}
              >
                <span className="ge-c-date mono">{date[rowIdx]}</span>
                <span className="ge-c-name" title={name[rowIdx]}>
                  {name[rowIdx]}
                </span>
                <span className={`ge-c-type ge-tag ge-tag-${TYPE_VARIANT[tc]} mono`}>
                  {data.type_labels[tc]}
                </span>
              </div>
            );
          })}
          {total === 0 && (
            <div className="ge-empty mono">ŽIADNE VÝSLEDKY PRE TENTO FILTER</div>
          )}
        </div>
      </div>
    </div>
  );
}
