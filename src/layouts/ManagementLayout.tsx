import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { ManagementContext } from '../context/ManagementContext'
import { LayoutDashboard, List, BarChart2, Users, MoreHorizontal } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'

const NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/orders',    label: 'Orders',    icon: List },
  { path: '/reports',   label: 'Reports',   icon: BarChart2 },
  { path: '/signin',    label: 'Team',      icon: Users },
  { path: '/mgmt-more', label: 'More',      icon: MoreHorizontal },
]

export default function ManagementLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { accountId } = useAuth()
  const { setActiveLocation, locations } = useLocations(accountId)

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Top bar */}
      <div className="bg-navy px-4 py-3 flex items-center justify-center flex-shrink-0">
        <div className="bg-white rounded-xl px-3 py-1.5 inline-block">
          <img src="/stitch-logo.png" alt="Stitch" className="h-6 object-contain" />
        </div>
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
