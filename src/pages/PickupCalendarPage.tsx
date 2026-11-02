import { useEffect, useState, useMemo } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { withRetry } from '../lib/withRetry'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { todayLocal } from '../lib/dateUtils'
import { useNavigate } from 'react-router-dom'

interface Order {
  id: string
  pickupDate: string   // YYYY-MM-DD
  orderAmount: number
  status: string
  locationId?: string
  items?: string
  orderNumberString?: string
  customerName?: string
  customerPhone?: string
  location?: string
}

const DAY_LABELS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']

// Week starts Saturday → Saturday = 0 in our grid
// JS getDay(): 0=Sun,1=Mon,...,6=Sat
// Map JS day → grid col: Sat(6)→0, Sun(0)→1, Mon(1)→2, ..., Fri(5)→6
function jsToGridCol(jsDay: number) {
  return jsDay === 6 ? 0 : jsDay + 1
}

function todayYMD() {
  return todayLocal()
}

export default function PickupCalendarPage() {
  const { accountId } = useAuth()
  const { locations, activeLocation } = useLocations(accountId)
  const navigate = useNavigate()

  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [_loading, setLoading] = useState(true)
  const [_error, setError] = useState(false)

  function formatDateLabel(iso: string) {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-AU', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
  }

  // Current month view
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth()) // 0-based

  // Default to active location once loaded
  useEffect(() => {
    if (activeLocation && !selectedLocationId) {
      setSelectedLocationId(activeLocation.id)
    }
  }, [activeLocation, selectedLocationId])

  // Load orders — scoped to selected location for speed, all when 'all' chosen
  useEffect(() => {
    if (!accountId || !selectedLocationId) return
    setLoading(true)
    const q = selectedLocationId === 'all'
      ? withRetry(() => getDocs(collection(db, 'accounts', accountId, 'orders')))
      : withRetry(() => getDocs(query(collection(db, 'accounts', accountId, 'orders'), where('locationId', '==', selectedLocationId))))
    q.then(snap => {
      const pending = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Order))
        .filter(o => o.status !== 'Picked Up' && o.status !== 'Cancelled' && o.status !== 'Ready for Pick Up')
      setOrders(pending)
      setLoading(false)
    }).catch(() => { setLoading(false); setError(true) })
  }, [accountId, selectedLocationId])

  // Filter by location
  const filteredOrders = useMemo(() => {
    if (selectedLocationId === 'all') return orders
    return orders.filter(o => o.locationId === selectedLocationId)
  }, [orders, selectedLocationId])

  const today = todayYMD()

  // Orders for selected day (derived from already-loaded orders)
  const sheetOrders = useMemo(() => {
    if (!selectedDate) return []
    return filteredOrders
      .filter(o => o.pickupDate === selectedDate)
      .map(o => {
        let items: any[] = []
        try { items = JSON.parse(o.items || '[]') } catch { items = [] }
        return { ...o, parsedItems: items }
      })
      .sort((a, b) => (a.orderNumberString ?? '').localeCompare(b.orderNumberString ?? ''))
  }, [selectedDate, filteredOrders])

  // Group pending orders by pickupDate for current month
  const calendarData = useMemo(() => {
    const map: Record<string, { count: number; total: number; dcCount: number }> = {}
    const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
    filteredOrders.forEach(o => {
      if (!o.pickupDate?.startsWith(monthStr)) return
      if (!map[o.pickupDate]) map[o.pickupDate] = { count: 0, total: 0, dcCount: 0 }
      map[o.pickupDate].count++
      map[o.pickupDate].total += o.orderAmount ?? 0
      try {
        const items = JSON.parse(o.items || '[]')
        if (items.some((it: any) => String(it.category ?? '').startsWith('Dry Cleaning'))) {
          map[o.pickupDate].dcCount++
        }
      } catch { /* ignore */ }
    })
    return map
  }, [filteredOrders, viewYear, viewMonth])

  // Build calendar grid
  const calendarDays = useMemo(() => {
    // First day of month
    const firstDay = new Date(viewYear, viewMonth, 1)
    const startCol = jsToGridCol(firstDay.getDay())
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

    const cells: { day: number | null; dateStr: string | null }[] = []
    // Leading empty cells
    for (let i = 0; i < startCol; i++) cells.push({ day: null, dateStr: null })
    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ day: d, dateStr })
    }
    return cells
  }, [viewYear, viewMonth])

  // Build rows (7 cells each)
  const rows: typeof calendarDays[] = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    rows.push(calendarDays.slice(i, i + 7))
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-AU', {
    month: 'long', year: 'numeric'
  })

  return (
    <div className="flex flex-col h-full bg-gray-100 overflow-y-auto">
      {/* Back button */}
      <div className="px-4 pt-5 pb-2 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-200"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Location picker */}
      <div className="px-4 pb-3 flex-shrink-0">
        <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200">
          <select
            value={selectedLocationId}
            onChange={e => setSelectedLocationId(e.target.value)}
            className="w-full text-blue-500 font-semibold text-base bg-transparent border-none outline-none cursor-pointer"
          >
            <option value="all">All Locations</option>
            {locations.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>


      {/* Calendar */}
      <div className="px-4 flex-shrink-0">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 text-blue-500">
            <ChevronLeft size={22} />
          </button>
          <span className="text-lg font-bold text-gray-900">{monthLabel}</span>
          <button onClick={nextMonth} className="p-2 text-blue-500">
            <ChevronRight size={22} />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar rows */}
        <div className="space-y-1">
          {rows.map((row, ri) => (
            <div key={ri} className="grid grid-cols-7 gap-0.5">
              {/* Pad to 7 cells */}
              {Array.from({ length: 7 }).map((_, ci) => {
                const cell = row[ci]
                if (!cell || !cell.day) return <div key={ci} className="h-14" />

                const { day, dateStr } = cell
                const isToday = dateStr === today
                const isOverdue = dateStr! < today
                const data = calendarData[dateStr!]

                return (
                  <div key={ci} className={`flex flex-col items-center py-1 ${data ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
                    onClick={() => data && dateStr && setSelectedDate(dateStr)}>
                    {/* Day number */}
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium mb-0.5
                      ${isToday ? 'bg-gray-700 text-white' : 'text-gray-700'}`}>
                      {day}
                    </div>

                    {/* Badge */}
                    {data ? (
                      <div className={`rounded-lg px-1 py-0.5 text-center w-full max-w-[52px]
                        ${isOverdue || isToday ? 'bg-red-100' : 'bg-blue-100'}`}>
                        <div className={`text-xs font-semibold leading-tight
                          ${isOverdue || isToday ? 'text-red-500' : 'text-blue-600'}`}>
                          {data.count} {data.count === 1 ? 'job' : 'jobs'}
                        </div>
                        <div className={`text-xs leading-tight
                          ${isOverdue || isToday ? 'text-red-400' : 'text-blue-500'}`}>
                          ${Math.round(data.total).toLocaleString()}
                        </div>
                        {data.dcCount > 0 && (
                          <div className="text-xs leading-tight text-amber-600 font-medium mt-0.5">
                            🧺 {data.dcCount}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Day sheet bottom sheet ── */}
      {selectedDate && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
          onClick={() => setSelectedDate(null)}>
          <div className="relative bg-white rounded-t-3xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}>

            {/* Sheet header */}
            <div className="flex items-center px-5 pt-5 pb-3 shrink-0">
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-base">{formatDateLabel(selectedDate)}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {sheetOrders.length} order{sheetOrders.length !== 1 ? 's' : ''} In progress
                </p>
              </div>
              <button onClick={() => setSelectedDate(null)} className="p-2 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Order list */}
            <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3">
              {sheetOrders.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No In progress orders for this date</p>
              ) : (
                sheetOrders.map((order, i) => {
                  const hasDC = order.parsedItems.some((it: any) => String(it.category ?? '').startsWith('Dry Cleaning'))
                  return (
                    <div key={i} className="bg-gray-50 rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-sm text-gray-900">{order.orderNumberString}</p>
                            {hasDC && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">🧺 DC</span>}
                          </div>
                          <p className="text-sm text-gray-600">{order.customerName}</p>
                          {order.customerPhone && (
                            <p className="text-xs text-gray-400">{order.customerPhone}</p>
                          )}
                        </div>
                        <p className="font-semibold text-navy text-sm">${(order.orderAmount ?? 0).toFixed(2)}</p>
                      </div>
                      {order.parsedItems.length > 0 && (
                        <div className="mt-2 space-y-0.5">
                          {order.parsedItems.slice(0, 3).map((it: any, j: number) => (
                            <p key={j} className="text-xs text-gray-500 truncate">· {it.name}</p>
                          ))}
                          {order.parsedItems.length > 3 && (
                            <p className="text-xs text-gray-400">+{order.parsedItems.length - 3} more items</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
