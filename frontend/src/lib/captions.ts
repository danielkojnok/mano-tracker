/* captions.ts — Slovak presentation translations for caption text that lives,
 * in English, inside model-owned JSON we must not edit (frontend/public/data).
 *
 * These are display-only strings; the JSON values are unchanged (single source
 * of truth preserved). Existing Slovak UI strings stay as-is; this only covers
 * leftover English captions surfaced from the data layer. */

/** backtest.json `note` — rendered by BacktestTable and MapeTracker.
 *  EN: "Model lags the REAL insolvency series ~25m; Covid-suppressed 2020
 *  insolvencies distort FY22/FY23. Realised = MANO RNS cash-collected." */
export const BACKTEST_NOTE_SK =
  "Model lagne REÁLNU insolvenčnú sériu o ~25m; Covidom potlačené insolvencie " +
  "2020 deformujú FY22/FY23. Realita = inkasované cash z MANO RNS.";
