import { NavLink } from "react-router-dom";
import "./Sidebar.css";

// `short` labels are used by the ≤768 bottom tab bar (the full labels are too
// long for a 5-item row on ~390px); desktop uses the full `label`.
const ITEMS = [
  { to: "/", label: "Prehľad", short: "Prehľad" },
  { to: "/trh", label: "Insolvenčný trh", short: "Trh" },
  { to: "/pipeline", label: "Pipeline model", short: "Model" },
  { to: "/spolocnost", label: "Spoločnosť", short: "Firma" },
  { to: "/diagnostika", label: "Dáta & diagnostika", short: "Dáta" },
];

/** Sidebar — DESIGN-MANUAL.md §09: ◆ active / ◇ inactive. On ≤768 it becomes a
 *  fixed bottom tab bar (§24) with all 5 pages always visible. */
export default function Sidebar() {
  return (
    <nav className="sidebar">
      {ITEMS.map(({ to, label, short }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) => `sidebar-item${isActive ? " active" : ""}`}
        >
          {({ isActive }) => (
            <>
              <span className="sidebar-marker" aria-hidden="true">
                {isActive ? "◆" : "◇"}
              </span>
              <span className="sidebar-label sidebar-label-full">{label}</span>
              <span className="sidebar-label sidebar-label-short">{short}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
