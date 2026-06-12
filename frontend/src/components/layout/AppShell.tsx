import type { ReactNode } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Ticker from "./Ticker";
import FooterDisclaimer from "./FooterDisclaimer";
import "./AppShell.css";

/** App shell grid: header / sidebar / main / footer + fixed ticker. */
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
      <Ticker />
    </div>
  );
}
