/**
 * errorLogger.ts
 * Silently logs app crashes to Firestore /errorLogs collection.
 * Rate-limited to 1 write per device per minute to avoid noise on bad deploys.
 */

import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { getApp } from 'firebase/app'

const RATE_LIMIT_MS = 60_000 // 1 per minute per device
const LS_KEY = 'stitch_last_error_log'

function canLog(): boolean {
  const last = parseInt(localStorage.getItem(LS_KEY) ?? '0', 10)
  return Date.now() - last > RATE_LIMIT_MS
}

function markLogged() {
  localStorage.setItem(LS_KEY, String(Date.now()))
}

export async function logError(
  error: unknown,
  context: 'ErrorBoundary' | 'uncaught' | 'unhandledrejection' = 'uncaught'
): Promise<void> {
  try {
    if (!canLog()) return

    const err = error instanceof Error ? error : new Error(String(error))

    // Skip noisy non-critical errors that staff won't notice
    const msg = err.message ?? ''
    if (msg.includes('ResizeObserver') || msg.includes('Non-Error promise rejection')) return

    markLogged()

    const db = getFirestore(getApp())

    await addDoc(collection(db, 'errorLogs'), {
      timestamp:   serverTimestamp(),
      context,
      message:     err.message   ?? 'Unknown error',
      stack:       err.stack     ?? '',
      page:        window.location.pathname,
      appVersion:  (window as any).__STITCH_VERSION__ ?? 'unknown',
      userAgent:   navigator.userAgent,
      // Account/location context — best effort from localStorage
      locationId:  localStorage.getItem('stitch_active_location') ?? '',
      deviceMode:  localStorage.getItem('stitch_device_mode') ?? '',
    })
  } catch {
    // Never let the logger itself cause issues
  }
}
