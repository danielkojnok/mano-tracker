import { useEffect, useState } from "react";
import "./BootSequence.css";

/* §19 boot sekvencia — once per session, skippable, max 2s total. */

const LINES = [
  "> INIT MANO TRACKER v2.0",
  "> DB ................. OK ✓",
  "> FEEDS: GAZETTE / RNS / YFINANCE ... OK ✓",
  "> MODEL pipeline.py v0.2 ..... OK ✓",
  "> RENDER TERMINAL █",
];

const LINE_DELAY = 200;
const HOLD_MS = 400;
const FADE_MS = 120;

const SEEN_KEY = "mano_boot_seen";

export default function BootSequence() {
  const [phase, setPhase] = useState<"hidden" | "running" | "fading">(() =>
    sessionStorage.getItem(SEEN_KEY) ? "hidden" : "running",
  );
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (phase !== "running") return;
    sessionStorage.setItem(SEEN_KEY, "1");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("hidden");
      return;
    }

    const timers: number[] = [];
    LINES.forEach((_, i) => {
      timers.push(window.setTimeout(() => setShown(i + 1), (i + 1) * LINE_DELAY));
    });
    timers.push(
      window.setTimeout(
        () => setPhase("fading"),
        LINES.length * LINE_DELAY + HOLD_MS,
      ),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== "fading") return;
    const t = window.setTimeout(() => setPhase("hidden"), FADE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div
      className={`boot-screen${phase === "fading" ? " boot-fading" : ""}`}
      onClick={() => setPhase("hidden")}
    >
      <pre className="boot-text mono">
        {LINES.slice(0, shown).map((l, i) => (
          <div key={i} className={i === LINES.length - 1 ? "boot-cursor-line" : ""}>
            {l.split("✓").map((part, j, arr) =>
              j < arr.length - 1 ? (
                <span key={j}>
                  {part}
                  <span className="up">✓</span>
                </span>
              ) : (
                <span key={j}>{part}</span>
              ),
            )}
          </div>
        ))}
      </pre>
    </div>
  );
}
