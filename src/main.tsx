import { StrictMode } from 'react'

// Fetch and store the current build version on load.
// POSLayout checks this when the screensaver activates to auto-update.
fetch('/version.json?t=' + Date.now())
  .then(r => r.json())
  .then(({ version }) => { (window as any).__STITCH_VERSION__ = version })
  .catch(() => {})
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
