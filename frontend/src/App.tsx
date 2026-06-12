import { HashRouter, Routes, Route } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import BootSequence from "./components/layout/BootSequence";
import Overview from "./pages/Overview";
import Market from "./pages/Market";
import PipelineModel from "./pages/PipelineModel";
import Company from "./pages/Company";
import Diagnostics from "./pages/Diagnostics";

/* HashRouter — GitHub Pages has no SPA rewrites; hash routing avoids 404s. */
export default function App() {
  return (
    <HashRouter>
      <BootSequence />
      <AppShell>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/trh" element={<Market />} />
          <Route path="/pipeline" element={<PipelineModel />} />
          <Route path="/spolocnost" element={<Company />} />
          <Route path="/diagnostika" element={<Diagnostics />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
}
