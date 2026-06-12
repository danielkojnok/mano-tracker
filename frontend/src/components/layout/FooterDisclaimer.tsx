import "./FooterDisclaimer.css";

/** Disclaimer strip above ticker — DESIGN-MANUAL.md §26.
 *  "CELÁ PRAVDA" drawer comes in F4 — no-op link for now. */
export default function FooterDisclaimer() {
  return (
    <div className="footer-disclaimer mono">
      <span>NIKTO NIČ NEGARANTUJE.</span>
      <a
        href="#"
        onClick={(e) => e.preventDefault()}
        title="Drawer s plným právnym textom príde vo fáze F4"
      >
        CELÁ PRAVDA →
      </a>
    </div>
  );
}
