import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  ShoppingBag, BarChart2, ClipboardList, Users,
  Calendar, LogOut, ChevronDown, Menu, Layers
} from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'

const MOCK_LOCATIONS = ['Carlingford', 'Eastgardens', 'Bondi', 'St Ives', 'Warringah', 'Sydney']

const NAV = [
  { to: '/pos',      icon: Layers,       label: 'POS'       },
  { to: '/orders',   icon: ShoppingBag,  label: 'Orders'    },
  { to: '/reports',  icon: BarChart2,    label: 'Reports'   },
  { to: '/signin',   icon: ClipboardList,label: 'Sign-In'   },
  { to: '/roster',   icon: Calendar,     label: 'Roster'    },
  { to: '/staff',    icon: Users,        label: 'Staff'     },
]

export default function AppShell() {
  const [location, setLocation] = useState(MOCK_LOCATIONS[0])
  const [locationOpen, setLocationOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar — desktop always visible, mobile overlay */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-56 bg-navy flex flex-col transition-transform duration-200
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
          <div className="w-7 h-7 bg-tan rounded-md flex items-center justify-center shrink-0">
            <span className="text-navy font-bold text-sm">S</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Stitch</span>
        </div>

        {/* Location switcher */}
        <div className="px-3 py-3 border-b border-white/10">
          <button
            onClick={() => setLocationOpen(o => !o)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-left"
          >
            <span className="text-white text-sm font-medium truncate">{location}</span>
            <ChevronDown size={14} className={`text-white/60 shrink-0 transition-transform ${locationOpen ? 'rotate-180' : ''}`} />
          </button>
          {locationOpen && (
            <div className="mt-1 bg-white rounded-lg shadow-lg overflow-hidden">
              {MOCK_LOCATIONS.map(loc => (
                <button
                  key={loc}
                  onClick={() => { setLocation(loc); setLocationOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    loc === location ? 'text-navy font-semibold' : 'text-gray-700'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar — mobile only */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-navy rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <span className="font-bold text-navy">Stitch</span>
          </div>
          <div className="w-8" /> {/* spacer */}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
