import { useState } from "react";
import TruthDrawer from "./TruthDrawer";
import { buildLabel } from "../../lib/buildInfo";
import "./FooterDisclaimer.css";

/** Disclaimer strip above ticker — DESIGN-MANUAL.md §26.
 *  The "CELÁ PRAVDA" link opens the honest-capstone drawer. A small, muted
 *  build stamp (SHA · date) sits on the right as the "am I on latest" canary. */
export default function FooterDisclaimer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="footer-disclaimer mono">
        <span>NIKTO NIČ NEGARANTUJE.</span>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
        >
          CELÁ PRAVDA →
        </a>
        <span className="footer-build" title="verzia buildu (canary čerstvosti)">
          build {buildLabel()}
        </span>
      </div>
      <TruthDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
