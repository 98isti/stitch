/**
 * dateUtils.ts — timezone-aware date helpers for Stitch
 *
 * Uses the device's browser timezone (the device is physically at the shop,
 * so its clock IS the business time). Falls back to Australia/Sydney if the
 * browser cannot detect a timezone.
 *
 * NEVER use .toISOString() for business dates — it always returns UTC.
 */

export const DEVICE_TZ: string =
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'Australia/Sydney'

/** Returns YYYY-MM-DD in the device's local timezone */
export function toLocalDate(tsMs: number, tz = DEVICE_TZ): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(tsMs))
}

/** Today's date as YYYY-MM-DD in device timezone */
export function todayLocal(tz = DEVICE_TZ): string {
  return toLocalDate(Date.now(), tz)
}

/** Yesterday's date as YYYY-MM-DD in device timezone */
export function yesterdayLocal(tz = DEVICE_TZ): string {
  return toLocalDate(Date.now() - 86_400_000, tz)
}

/**
 * Format a unix-seconds timestamp as a time string in device timezone.
 * e.g. "4:36 pm"
 */
export function formatTimeLocal(seconds: number, tz = DEVICE_TZ): string {
  return new Date(seconds * 1000).toLocaleTimeString('en-AU', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Format a unix-seconds timestamp as short date+time in device timezone.
 * e.g. "21 Oct, 4:36 pm"
 */
export function formatDateTimeLocal(seconds: number, tz = DEVICE_TZ): string {
  return new Date(seconds * 1000).toLocaleString('en-AU', {
    timeZone: tz,
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Human-readable date group header.
 * Returns "Today", "Yesterday", or "Monday 20 October"
 */
export function formatDateHeader(dateStr: string, tz = DEVICE_TZ): string {
  const today = todayLocal(tz)
  const yesterday = yesterdayLocal(tz)
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  // Parse as local noon to avoid any midnight-boundary edge cases
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
}

/**
 * Returns a YYYY-MM-DD string for a given Date object in device timezone.
 * Drop-in replacement for d.toLocaleDateString('en-CA') with explicit tz.
 */
export function dateToLocalISO(d: Date, tz = DEVICE_TZ): string {
  return toLocalDate(d.getTime(), tz)
}

/**
 * Min date string (YYYY-MM-DD) for date inputs — today in device timezone.
 * Use as the `min` attribute on <input type="date"> to block past dates.
 */
export function minDateLocal(tz = DEVICE_TZ): string {
  return todayLocal(tz)
}
