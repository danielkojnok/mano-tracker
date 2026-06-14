import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

// Short git SHA for the build stamp: prefer GITHUB_SHA (set in CI), fall back
// to `git rev-parse` locally, then "dev" if neither is available.
function buildSha(): string {
  const ci = process.env.GITHUB_SHA
  if (ci) return ci.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
}

// https://vite.dev/config/
// NOTE: asset hashing is Vite's default (rollupOptions untouched), so JS/CSS
// filenames stay content-hashed and cache-bust automatically.
export default defineConfig({
  plugins: [react()],
  base: '/mano-tracker/', // GitHub Pages project path
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BUILD_SHA__: JSON.stringify(buildSha()),
  },
})
