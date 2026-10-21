/**
 * ErrorBoundary.tsx
 * Catches React render crashes and shows a friendly recovery screen
 * instead of a blank white page. Staff can tap "Reload" to recover
 * without needing to force-quit the app.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logError } from '../lib/errorLogger'

interface Props { children: ReactNode }
interface State { crashed: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError(error, 'ErrorBoundary')
    console.error('[ErrorBoundary]', error, info)
  }

  static getDerivedStateFromError(): State {
    return { crashed: true }
  }

  render() {
    if (!this.state.crashed) return this.props.children

    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white px-8 text-center">
        <p className="text-5xl mb-6">😕</p>
        <p className="text-xl font-bold text-gray-800 mb-2">Something went wrong</p>
        <p className="text-sm text-gray-500 mb-8">
          The app ran into an unexpected error. Tap the button below to reload.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-navy text-white text-base font-semibold rounded-2xl shadow-md active:scale-95 transition-transform">
          Reload App
        </button>
      </div>
    )
  }
}
