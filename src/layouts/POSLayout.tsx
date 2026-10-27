import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { ClipboardList, List, Calendar, MoreHorizontal, LogOut, BarChart2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useDailyRevenue } from '../hooks/useDailyRevenue'
import { useLocations } from '../hooks/useLocations'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import ScreenSaver from '../components/ScreenSaver'
import { useStaff } from '../context/StaffContext'

const IDLE_TIMEOUT = 10 * 60 * 1000 // 10 minutes

const MORE_GROUPS = [
  {
    label: 'People',
    items: [
      { label: 'Staff',      icon: '👤', path: '/staff' },
      { label: 'Customers',  icon: '👥', path: '/customers' },
      { label: 'Leave',      icon: '🌴', path: '/leave' },
    ]
  },
  {
    label: 'Catalogue',
    items: [
      { label: 'Items',        icon: '🏷️', path: '/items' },
      { label: 'Categories',   icon: '📂', path: '/categories' },
      { label: 'Extras',       icon: '✨', path: '/extras' },
      { label: 'Quick Items',  icon: '⚡', path: '/quick-items' },
    ]
  },
  {
    label: 'Sales',
    items: [
      { label: 'Vouchers', icon: '🎟️', path: '/vouchers' },
    ]
  },
  {
    label: 'App',
    items: [
      { label: 'Settings', icon: '⚙️', path: '/settings' },
    ]
  },
]

export default function POSLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { accountId } = useAuth()
  const { staff } = useStaff()
  const [requirePin, setRequirePin] = useState(true)

  // On mount — if no staff session and not a management device, send to PIN
  useEffect(() => {
    const isManagementDevice = localStorage.getItem('stitch_device_mode') === 'management'
    if (!staff && !isManagementDevice) {
      navigate('/pin')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!accountId) return
    import('../lib/firebase').then(({ db }) => {
      import('firebase/firestore').then(({ doc, getDoc }) => {
        getDoc(doc(db, 'accounts', accountId)).then(snap => {
          if (snap.exists()) {
            const v = snap.data().requirePinAfterLock
            setRequirePin(v !== false)
          }
        }).catch(() => {})
      })
    })
  }, [accountId])
  const { activeLocation } = useLocations(accountId)
  const { revenue: dailyRevenue } = useDailyRevenue(accountId, activeLocation?.name ?? null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const revenueTarget = ((activeLocation as any)?.dailyTarget as number | undefined) ?? parseFloat(localStorage.getItem('stitch_revenue_target') ?? '500')
  const progressPct = revenueTarget > 0 ? Math.min(100, (dailyRevenue / revenueTarget) * 100) : 0
  const [showMore, setShowMore] = useState(false)
  const [showScreenSaver, setShowScreenSaver] = useState(false)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)

  const isPos = location.pathname === '/pos'

  // Auto-update check: fires when screensaver activates.
  // Fetches /version.json from Cloudflare and reloads if a newer build is available.
  // Safe to reload during screensaver — app is idle, no transaction in progress.
  useEffect(() => {
    if (!showScreenSaver) return
    const check = async () => {
      try {
        const res = await fetch('https://stitchapp.com.au/version.json?t=' + Date.now())
        const { version } = await res.json()
        const current = (window as any).__STITCH_VERSION__
        if (current && version !== current) {
          window.location.href = 'https://stitchapp.com.au'
        }
      } catch {}
    }
    check()
  }, [showScreenSaver])

  // Screen saver idle timer
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
      {showScreenSaver && <ScreenSaver onDismiss={() => {
        setShowScreenSaver(false)
        if (requirePin) navigate('/pin')
      }} />}

      {/* Sub-page header */}


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
              <div className="absolute bottom-full right-0 z-50 mb-2 mr-2 bg-gray-50 rounded-2xl shadow-2xl border border-gray-300 overflow-hidden w-80">
                {MORE_GROUPS.map((group, gi) => (
                  <div key={group.label} className={gi > 0 ? 'border-t border-gray-100' : ''}>
                    <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">{group.label}</p>
                    <div className="grid grid-cols-3 pb-2">
                      {group.items.map(item => (
                        <button key={item.label}
                          onClick={() => { navigate(item.path); setShowMore(false) }}
                          className="flex flex-col items-center gap-1.5 px-2 py-2.5 hover:bg-gray-50 rounded-xl mx-1 transition-colors">
                          <span className="text-xl">{item.icon}</span>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="border-t border-gray-100">
                  <button onClick={() => { setShowMore(false); setShowSignOutConfirm(true) }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-red-50 transition-colors text-sm font-medium text-red-500">
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
            <button onClick={() => navigate('/pickup')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium">
              <Calendar size={17} />
              <span>PickUp</span>
            </button>
            <button onClick={() => navigate('/reports')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium">
              <BarChart2 size={17} />
              <span>Daily Sales</span>
            </button>
            <button onClick={() => setShowMore(m => !m)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-colors text-sm font-medium ${showMore ? 'bg-navy text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              <MoreHorizontal size={17} />
              <span>More</span>
            </button>
          </div>
        </div>
      )}

      {/* ── SIGN OUT CONFIRMATION DIALOG ── */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-6">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <LogOut size={24} className="text-red-500" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Sign Out?</h2>
              <p className="text-sm text-gray-500">
                Signing back in requires the business email and password.
                Only do this if a manager is available.
              </p>
            </div>
            <button
              onClick={() => { setShowSignOutConfirm(false); signOut(auth) }}
              className="w-full py-3.5 rounded-2xl bg-red-500 text-white font-bold text-base hover:bg-red-600 transition-colors">
              Yes, Sign Out
            </button>
            <button
              onClick={() => setShowSignOutConfirm(false)}
              className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-base hover:bg-gray-200 transition-colors">
              Cancel
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
              style={{ width: `${progressPct}%`, background: progressPct >= 100 ? '#15803d' : '#1B2A4A' }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-4">
              <span className="text-xs font-semibold text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>Today: ${dailyRevenue.toFixed(0)}</span>
              <span className="text-xs font-semibold text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>${revenueTarget.toFixed(0)} target</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
