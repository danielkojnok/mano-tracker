import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CommandPalette.css";

/* Command palette ⌘K (manual §25.1 / §19) — overlay, fuzzy search across pages,
 * panels and key metrics; Enter navigates to the page (panels anchor to their
 * page). Pure navigation — no data is fabricated; metric values shown here are
 * read-through hints, the page is the source. ↑↓ ↵ Esc keyboard nav. */

type Kind = "STRÁNKA" | "PANEL" | "METRIKA";

interface Entry {
  kind: Kind;
  label: string;
  hint?: string;
  to: string;
}

const ENTRIES: Entry[] = [
  // pages
  { kind: "STRÁNKA", label: "Prehľad", to: "/" },
  { kind: "STRÁNKA", label: "Insolvenčný trh", to: "/trh" },
  { kind: "STRÁNKA", label: "Pipeline model", to: "/pipeline" },
  { kind: "STRÁNKA", label: "Spoločnosť", to: "/spolocnost" },
  { kind: "STRÁNKA", label: "Dáta & diagnostika", to: "/diagnostika" },
  // panels
  { kind: "PANEL", label: "Konverzný lievik", to: "/" },
  { kind: "PANEL", label: "Verdikt tézy", to: "/" },
  { kind: "PANEL", label: "Model → oceňovací most", to: "/pipeline" },
  { kind: "PANEL", label: "Tornado citlivosť", to: "/pipeline" },
  { kind: "PANEL", label: "Backtest modelu", to: "/pipeline" },
  { kind: "PANEL", label: "Lead-lag korelácia", to: "/trh" },
  { kind: "PANEL", label: "Sezónna matica", to: "/trh" },
  { kind: "PANEL", label: "Trhová štruktúra IP firiem", to: "/trh" },
  { kind: "PANEL", label: "Regionálne rozloženie", to: "/trh" },
  { kind: "PANEL", label: "Cena & drawdown", to: "/spolocnost" },
  { kind: "PANEL", label: "Peer porovnanie", to: "/spolocnost" },
  { kind: "PANEL", label: "Zdravie súvahy", to: "/spolocnost" },
  { kind: "PANEL", label: "Freshness matrix", to: "/diagnostika" },
  { kind: "PANEL", label: "Gazette explorer", to: "/diagnostika" },
  // key metrics (hints; the page is the source of truth)
  { kind: "METRIKA", label: "FY27 base revenue", hint: "£32.01m · pipeline.py", to: "/pipeline" },
  { kind: "METRIKA", label: "Insolvencie 12M", hint: "21 716", to: "/trh" },
  { kind: "METRIKA", label: "Cena MANO.L", hint: "39.3p", to: "/spolocnost" },
  { kind: "METRIKA", label: "Singer target", hint: "130p · +231%", to: "/spolocnost" },
  { kind: "METRIKA", label: "Model MAPE", hint: "24.4% · cieľ <30%", to: "/diagnostika" },
  { kind: "METRIKA", label: "NAV / akcia", hint: "~95p", to: "/spolocnost" },
];

/* tiny subsequence fuzzy match — every query char appears in order */
function fuzzy(q: string, s: string): boolean {
  if (!q) return true;
  q = q.toLowerCase();
  s = s.toLowerCase();
  let i = 0;
  for (const ch of s) {
    if (ch === q[i]) i++;
    if (i === q.length) return true;
  }
  return i === q.length;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // global ⌘K / Ctrl+K toggle + a custom event so a tappable trigger (the
  // header button on mobile, where there's no keyboard) can open it too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mano:open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mano:open-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(
    () =>
      ENTRIES.filter(
        (e) => fuzzy(query, e.label) || (e.hint ? fuzzy(query, e.hint) : false),
      ),
    [query],
  );

  if (!open) return null;

  const go = (entry?: Entry) => {
    const target = entry ?? results[active];
    if (!target) return;
    navigate(target.to);
    setOpen(false);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go();
    }
  };

  return (
    <div className="cmdk-overlay" onMouseDown={() => setOpen(false)}>
      <div className="cmdk-panel" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cmdk-input mono"
          placeholder="Hľadať stránky, panely, metriky…  (⌘K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onInputKey}
        />
        <div className="cmdk-results">
          {results.length === 0 && (
            <div className="cmdk-empty mono">ŽIADNE VÝSLEDKY</div>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.kind}-${r.label}`}
              className={`cmdk-item${i === active ? " cmdk-active" : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r)}
            >
              <span className="cmdk-kind mono">{r.kind}</span>
              <span className="cmdk-label">{r.label}</span>
              {r.hint && <span className="cmdk-hint mono">{r.hint}</span>}
            </button>
          ))}
        </div>
        <div className="cmdk-foot mono">↑↓ navigácia · ↵ otvoriť · Esc zavrieť</div>
      </div>
    </div>
  );
}
