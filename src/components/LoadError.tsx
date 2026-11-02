/**
 * LoadError — shown when all retry attempts fail.
 * Neutral, non-alarming. Never looks like "no results".
 */
export default function LoadError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400 px-6 text-center">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 text-gray-300">
        <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0"/>
        <path d="M12 8v4"/>
        <path d="M12 16h.01"/>
      </svg>
      <p className="text-sm font-medium text-gray-500">Couldn't load data</p>
      <p className="text-xs text-gray-400 mt-1">Check your connection and try again</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 text-xs font-semibold text-navy border border-navy/30 rounded-xl hover:bg-navy/5 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  )
}
