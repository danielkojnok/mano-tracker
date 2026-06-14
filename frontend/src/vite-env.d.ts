/// <reference types="vite/client" />

// Build stamp constants injected by vite `define` (see vite.config.ts).
declare const __BUILD_TIME__: string; // ISO timestamp at build
declare const __BUILD_SHA__: string; // short git SHA, or "dev" locally
