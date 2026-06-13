import { useState } from "react";
import TruthDrawer from "./TruthDrawer";
import "./FooterDisclaimer.css";

/** Disclaimer strip above ticker — DESIGN-MANUAL.md §26.
 *  The "CELÁ PRAVDA" link opens the honest-capstone drawer. */
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
      </div>
      <TruthDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
