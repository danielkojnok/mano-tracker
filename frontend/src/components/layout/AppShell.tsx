import type { ReactNode } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import FooterDisclaimer from "./FooterDisclaimer";
import CommandPalette from "../ui/CommandPalette";
import "./AppShell.css";

/** App shell grid: header / sidebar / main / footer.
 *  CommandPalette (⌘K) is mounted here so it's available on every page. */
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell container">
      <Header />
      <div className="app-body">
        <Sidebar />
        <main className="app-main">
          {children}
          <FooterDisclaimer />
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
