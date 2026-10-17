import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { ManagementContext } from '../context/ManagementContext'
import { LayoutDashboard, List, BarChart2, Users, MoreHorizontal } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'

const NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/mgmt-orders', label: 'Orders',  icon: List },
  { path: '/mgmt-report', label: 'Reports', icon: BarChart2 },
  { path: '/mgmt-team', label: 'Team',      icon: Users },
  { path: '/mgmt-more', label: 'More',      icon: MoreHorizontal },
]

export default function ManagementLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { accountId } = useAuth()
  useLocations(accountId) // keep subscription active for location data

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Top bar — safe area inset for iPhone notch/Dynamic Island */}
      <div className="bg-navy px-4 flex items-center flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)', paddingBottom: '8px' }}>
        <img src="/stitch-logo.png" alt="Stitch" className="h-5 object-contain brightness-0 invert" />
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-hidden">
        <ManagementContext.Provider value={true}>
          <Outlet />
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
                <item.icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
