import { useState, useEffect, useCallback } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { ClipboardList, List, Calendar, MoreHorizontal, LogOut, ChevronLeft, BarChart2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useDailyRevenue } from '../hooks/useDailyRevenue'
import { useLocations } from '../hooks/useLocations'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import ScreenSaver from '../components/ScreenSaver'

const IDLE_TIMEOUT = 5 * 60 * 1000 // 5 min

const MORE_ITEMS = [
  { label: 'Staff',        icon: '👤', path: '/staff' },
  { label: 'Customers',    icon: '👥', path: '/customers' },
  { label: 'Categories',   icon: '📂', path: '/categories' },
  { label: 'Items',        icon: '🏷️', path: '/items' },
  { label: 'Vouchers',     icon: '🎟️', path: '/vouchers' },
  { label: 'Locations',    icon: '📍', path: '/locations' },
  { label: 'Settings',     icon: '⚙️', path: '/settings' },
  { label: 'Daily Reports', icon: '📊', path: '/reports' },
]

const PAGE_TITLES: Record<string, string> = {
  '/orders':    'Orders',
  '/signin':    'Sign In / Sign Out',
  '/roster':    'PickUp Calendar',
  '/reports':   'Reports',
  '/staff':     'Staff',
  '/customers': 'Customers',
  '/items':     'Price List',
  '/categories':'Categories',
  '/vouchers':  'Gift Vouchers',
  '/settings':  'Settings',
  '/locations': 'Locations',
  '/timesheet': 'My Timesheet',
  '/leave':     'Leave',
  '/todaysdue': "Today's Due",
}

export default function POSLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { accountId } = useAuth()
  const { activeLocation } = useLocations(accountId)
  const { revenue: dailyRevenue } = useDailyRevenue(accountId, activeLocation?.name ?? null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const revenueTarget = ((activeLocation as any)?.dailyTarget as number | undefined) ?? parseFloat(localStorage.getItem('stitch_revenue_target') ?? '500')
  const progressPct = revenueTarget > 0 ? Math.min(100, (dailyRevenue / revenueTarget) * 100) : 0
  const [showMore, setShowMore] = useState(false)
  const [showScreenSaver, setShowScreenSaver] = useState(false)

  const isPos = location.pathname === '/pos'

  // Dynamic title — handle nested routes like /orders/:id
  const pageTitle = PAGE_TITLES[location.pathname]
    ?? (location.pathname.startsWith('/orders/') && location.pathname.endsWith('/edit') ? 'Edit Order'
    : location.pathname.startsWith('/orders/') ? 'Order Detail'
    : undefined)

  // Screen saver idle timer
  const resetIdle = useCallback(() => {
    setShowScreenSaver(false)
  }, [])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function resetTimer() {
      clearTimeout(timer)
      timer = setTimeout(() => setShowScreenSaver(true), IDLE_TIMEOUT)
    }
    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-100">

      {/* Screen saver */}
      {showScreenSaver && <ScreenSaver onDismiss={resetIdle} />}

      {/* Sub-page header */}
      {!isPos && (
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <button
            onClick={() => navigate(-1)}
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

      {/* Bottom nav — only on POS */}
      {isPos && (
        <div className="relative">
          {showMore && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
              <div className="absolute bottom-full right-0 z-50 mb-2 mr-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-72">
                <div className="grid grid-cols-2">
                  {MORE_ITEMS.map((item, i) => (
                    <button key={item.label}
                      onClick={() => { navigate(item.path); setShowMore(false) }}
                      className={`flex items-center gap-2 px-4 py-3.5 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700
                        ${i % 2 === 0 ? 'border-r border-gray-100' : ''}
                        ${i < MORE_ITEMS.length - 2 ? 'border-b border-gray-100' : ''}
                      `}>
                      <span>{item.icon}</span>{item.label}
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

          <div className="bg-white border-t border-gray-200 flex items-center px-2 py-1.5 gap-1">
            <button onClick={() => navigate('/signin')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium">
              <ClipboardList size={17} />
              <span>Sign In/Out</span>
            </button>
            <button onClick={() => navigate('/orders')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium">
              <List size={17} />
              <span>Orders</span>
            </button>
            <button onClick={() => navigate('/todaysdue')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium">
              <Calendar size={17} />
              <span>PickUp</span>
            </button>
            <button onClick={() => navigate('/reports')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium">
              <BarChart2 size={17} />
              <span>Reports</span>
            </button>
            <button onClick={() => setShowMore(m => !m)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-colors text-sm font-medium ${showMore ? 'bg-navy text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              <MoreHorizontal size={17} />
              <span>More</span>
            </button>
          </div>
        </div>
      )}

      {/* ── REVENUE BAR — full width, below nav, only on POS ── */}
      {isPos && (
        <div className="bg-white border-t border-gray-100 shrink-0">
          <div className="relative h-7 bg-gray-100 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 transition-all duration-700"
              style={{ width: `${progressPct}%`, background: progressPct >= 100 ? '#16a34a' : '#1B2A4A' }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-4">
              <span className="text-xs font-semibold text-white mix-blend-difference">Today: ${dailyRevenue.toFixed(0)}</span>
              <span className="text-xs font-semibold text-white mix-blend-difference">${revenueTarget.toFixed(0)} target</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
