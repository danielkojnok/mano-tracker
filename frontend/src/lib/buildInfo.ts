/* Build canary — "am I on the latest version?" diagnostic.
 *
 * __BUILD_SHA__ / __BUILD_TIME__ are injected at build time by vite `define`
 * (vite.config.ts). SHA comes from GITHUB_SHA in CI, `git rev-parse` locally,
 * or "dev" if neither is available. This is the single source for both the
 * footer stamp and the Diagnostics page. */

export const BUILD_SHA = __BUILD_SHA__;
export const BUILD_TIME = __BUILD_TIME__;

/** "83dbd48 · 2026-06-14" — short SHA + build date (date portion of the ISO). */
export function buildLabel(): string {
  const date = BUILD_TIME.slice(0, 10); // YYYY-MM-DD
  return `${BUILD_SHA} · ${date}`;
}
