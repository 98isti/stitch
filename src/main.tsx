import { StrictMode } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import { logError } from './lib/errorLogger'

// Fetch and store the current build version on load.
// Use absolute URL — relative URLs in Capacitor WebView resolve to local bundle, not Cloudflare.
const VERSION_URL = 'https://stitchapp.com.au/version.json'
fetch(VERSION_URL + '?t=' + Date.now())
  .then(r => r.json())
  .then(({ version }) => { (window as any).__STITCH_VERSION__ = version })
  .catch(() => {})

// Nightly 3am reload — ensures app gets latest version within 24h regardless of screensaver.
function scheduleNightlyReload() {
  const now = new Date()
  const next3am = new Date(now)
  next3am.setHours(3, 0, 0, 0)
  if (next3am <= now) next3am.setDate(next3am.getDate() + 1)
  const ms = next3am.getTime() - now.getTime()
  setTimeout(() => { window.location.href = 'https://stitchapp.com.au' }, ms)
}
scheduleNightlyReload()

// ── Global error handlers ─────────────────────────────────────────────────────
// Catch uncaught JS errors that escape React's render cycle
window.addEventListener('error', (e) => {
  // Ignore cross-origin script errors (no useful info available)
  if (!e.message || e.message === 'Script error.') return
  logError(e.error ?? new Error(e.message), 'uncaught')
})

// Catch unhandled promise rejections (e.g. failed Firebase calls not caught)
window.addEventListener('unhandledrejection', (e) => {
  // Only log if the rejection looks like an actual app error (not a network timeout)
  const reason = e.reason
  if (!reason) return
  const msg = reason?.message ?? String(reason)
  // Skip transient network/Firebase fetch errors — these don't blank the screen
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) return
  logError(reason, 'unhandledrejection')
})

import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
