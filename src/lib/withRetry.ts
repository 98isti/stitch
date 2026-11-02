/**
 * withRetry — wraps any async function with automatic silent retry.
 *
 * On failure:
 *   attempt 1 → wait 1s  → retry
 *   attempt 2 → wait 2s  → retry
 *   attempt 3 → wait 4s  → retry
 *   all fail  → throw (caller handles final error state)
 *
 * The spinner keeps going during retries — user sees nothing.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000,
): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (retries <= 0) throw err
    await new Promise(r => setTimeout(r, delayMs))
    return withRetry(fn, retries - 1, delayMs * 2)
  }
}
