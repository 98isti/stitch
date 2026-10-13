import { StrictMode } from 'react'

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
  setTimeout(() => window.location.reload(), ms)
}
scheduleNightlyReload()
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
