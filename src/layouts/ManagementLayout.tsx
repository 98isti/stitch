import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { ManagementContext } from '../context/ManagementContext'
import { LayoutDashboard, List, BarChart2, ClipboardList, MoreHorizontal } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { useState, useEffect, useRef, type ReactNode } from 'react'

const NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/mgmt-orders', label: 'Orders',  icon: List },
  { path: '/mgmt-report', label: 'Reports', icon: BarChart2 },
  { path: '/mgmt-team', label: 'Sign In',   icon: ClipboardList },
  { path: '/mgmt-more', label: 'More',      icon: MoreHorizontal },
]

const REFRESH_COOLDOWN_MS = 5_000 // refresh if returning from background after 5s

import { Component } from 'react'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch() { this.setState({ hasError: true }) }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
          <p className="text-gray-500 text-sm">Something went wrong loading this page.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-navy text-white text-sm rounded-xl"
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function ManagementLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { accountId } = useAuth()
  useLocations(accountId) // keep subscription active for location data

  const [refreshKey, setRefreshKey] = useState(0)
  const lastRefreshRef = useRef<number>(Date.now())

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastRefreshRef.current < REFRESH_COOLDOWN_MS) return
      lastRefreshRef.current = now
      setRefreshKey(k => k + 1)
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Top bar */}
      <div className="bg-white flex-shrink-0 flex items-center justify-center" style={{ paddingTop: '18px', paddingBottom: '10px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <img src="/stitch-logo.png" alt="Stitch" className="h-7 object-contain" />
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-hidden">
        <ManagementContext.Provider value={true}>
          <ErrorBoundary key={refreshKey}><Outlet /></ErrorBoundary>
        </ManagementContext.Provider>
      </div>

      {/* Bottom nav */}
      <div className="bg-white border-t border-gray-200 flex-shrink-0 safe-area-bottom">
        <div className="flex">
          {NAV.map(item => {
            const active = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex-1 flex flex-col items-center pt-2 pb-3 gap-1 transition-colors ${
                  active ? 'text-navy' : 'text-gray-400'
                }`}
              >
                <item.icon size={26} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
