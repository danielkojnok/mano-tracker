import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789£▲▼◆";
const DURATION_MS = 400;
const TICK_MS = 40;

interface ScrambleTextProps {
  text: string;
  /** Re-trigger scramble when this flips to true. Mount always triggers once. */
  trigger?: boolean;
}

/** §19 mikrokinetika — Michroma titles scramble 400ms on page load, one-shot. */
export default function ScrambleText({ text, trigger = true }: ScrambleTextProps) {
  const [display, setDisplay] = useState(text);
  const done = useRef(false);

  useEffect(() => {
    if (!trigger || done.current) return;
    done.current = true;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(text);
      return;
    }

    const start = performance.now();
    const id = window.setInterval(() => {
      const elapsed = performance.now() - start;
      if (elapsed >= DURATION_MS) {
        window.clearInterval(id);
        setDisplay(text);
        return;
      }
      // progressively lock characters left → right
      const locked = Math.floor((elapsed / DURATION_MS) * text.length);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        if (i < locked || text[i] === " ") out += text[i];
        else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setDisplay(out);
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [text, trigger]);

  return <>{display}</>;
}
