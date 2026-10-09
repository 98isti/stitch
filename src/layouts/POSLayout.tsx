import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { ClipboardList, List, Calendar, MoreHorizontal, LogOut, ChevronLeft } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'

const MORE_ITEMS = [
  { label: 'Customers',    icon: '👥', path: '/customers' },
  { label: 'Items',        icon: '🏷️', path: '/items' },
  { label: 'Categories',   icon: '📂', path: '/categories' },
  { label: 'Vouchers',     icon: '🎟️', path: '/vouchers' },
  { label: 'Settings',     icon: '⚙️', path: '/settings' },
  { label: 'Daily Reports',icon: '📊', path: '/reports' },
  { label: 'My Timesheet', icon: '🕐', path: '/timesheet' },
  { label: 'Leave',        icon: '🌴', path: '/leave' },
]

const PAGE_TITLES: Record<string, string> = {
  '/orders':    'Orders',
  '/signin':    'Sign In / Sign Out',
  '/roster':    'PickUp Calendar',
  '/reports':   'Reports',
  '/staff':     'Staff',
  '/customers': 'Customers',
  '/items':     'Items',
  '/categories':'Categories',
  '/vouchers':  'Vouchers',
  '/settings':  'Settings',
  '/timesheet': 'My Timesheet',
  '/leave':     'Leave',
}

export default function POSLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [showMore, setShowMore] = useState(false)

  const isPos = location.pathname === '/pos'
  const pageTitle = PAGE_TITLES[location.pathname]

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-100">

      {/* Sub-page header — shown when not on POS */}
      {!isPos && (
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <button
            onClick={() => navigate('/pos')}
            className="flex items-center gap-1 text-navy font-medium text-sm hover:opacity-70 transition-opacity"
          >
            <ChevronLeft size={20} />
            Back
          </button>
          <h1 className="flex-1 text-center font-bold text-gray-900 text-base pr-12">{pageTitle}</h1>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>

      {/* ── BOTTOM NAV — only on POS ── */}
      {isPos && (
        <div className="relative">
          {/* More menu popup */}
          {showMore && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
              <div className="absolute bottom-full right-0 z-50 mb-2 mr-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-64">
                <div className="grid grid-cols-2">
                  {MORE_ITEMS.map((item, i) => (
                    <button key={item.label}
                      onClick={() => { navigate(item.path); setShowMore(false) }}
                      className={`flex items-center gap-2 px-4 py-3.5 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700
                        ${i % 2 === 0 ? 'border-r border-gray-100' : ''}
                        ${i < MORE_ITEMS.length - 2 ? 'border-b border-gray-100' : ''}
                      `}>
                      <span>{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="border-t border-gray-100">
                  <button onClick={() => signOut(auth)}
                    className="w-full flex items-center gap-2.5 px-4 py-3.5 hover:bg-red-50 transition-colors text-sm font-medium text-red-500">
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Nav bar */}
          <div className="bg-white border-t border-gray-200 flex items-center px-2 py-1.5 gap-1">
            <button onClick={() => navigate('/signin')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium">
              <ClipboardList size={17} />
              <span>Sign In / Out</span>
            </button>

            <button onClick={() => navigate('/orders')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium">
              <List size={17} />
              <span>Orders</span>
            </button>

            <button onClick={() => navigate('/roster')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium">
              <Calendar size={17} />
              <span>PickUp</span>
            </button>

            <button onClick={() => setShowMore(m => !m)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-colors text-sm font-medium ${
                showMore ? 'bg-navy text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}>
              <MoreHorizontal size={17} />
              <span>More</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
