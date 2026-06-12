import { NavLink } from "react-router-dom";
import "./Sidebar.css";

const ITEMS = [
  { to: "/", label: "Prehľad" },
  { to: "/trh", label: "Insolvenčný trh" },
  { to: "/pipeline", label: "Pipeline model" },
  { to: "/spolocnost", label: "Spoločnosť" },
  { to: "/diagnostika", label: "Dáta & diagnostika" },
];

/** Sidebar — DESIGN-MANUAL.md §09: ◆ active / ◇ inactive. */
export default function Sidebar() {
  return (
    <nav className="sidebar">
      {ITEMS.map(({ to, label }) => (
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
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
