import { useEffect, useState, useMemo } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Order {
  id: string
  orderAmount: number
  locationId?: string
  jobCompletedDate?: { seconds: number } | string | null
  [key: string]: any
}

// Resolve jobCompletedDate (Firestore Timestamp or string) → YYYY-MM-DD, or null
function resolveCompletedDate(val: any): string | null {
  if (!val) return null
  if (typeof val === 'string') return val.slice(0, 10)
  if (val.seconds) {
    const d = new Date(val.seconds * 1000)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  return null
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

function fmtDayName(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long' })
}

function dateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMondayOf(d: Date): Date {
  const day = new Date(d)
  const dow = day.getDay()
  day.setDate(day.getDate() - ((dow + 6) % 7))
  day.setHours(0, 0, 0, 0)
  return day
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export default function TeamPerformancePage() {
  const { accountId } = useAuth()
  const { locations } = useLocations(accountId)
  const navigate = useNavigate()

  const [selectedLocationId, setSelectedLocationId] = useState<string>('all')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accountId) return
    setLoading(true)
    getDocs(query(
      collection(db, 'accounts', accountId, 'orders'),
      orderBy('createdAt', 'desc')
    )).then(snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [accountId])

  // Filter by location
  const filteredOrders = useMemo(() => {
    if (selectedLocationId === 'all') return orders
    return orders.filter(o => o.locationId === selectedLocationId)
  }, [orders, selectedLocationId])

  // Completed orders only — completedBy is set when staff mark job Ready for Pickup
  const completedOrders = useMemo(() =>
    filteredOrders.filter(o => !!o.completedBy)
  , [filteredOrders])

  // 30-day avg per employee: total ÷ distinct days worked (matches SmartPOS formula)
  const thirtyDayAvg = useMemo(() => {
    const now = new Date()
    const cutoff = dateStr(addDays(now, -30))

    const byEmployee: Record<string, { total: number; days: Set<string> }> = {}
    completedOrders.forEach(o => {
      const d = resolveCompletedDate(o.jobCompletedDate)
      if (!d || d < cutoff) return
      const name = o.completedBy as string
      if (!byEmployee[name]) byEmployee[name] = { total: 0, days: new Set() }
      byEmployee[name].total += o.orderAmount ?? 0
      byEmployee[name].days.add(d)
    })

    const avg: Record<string, number> = {}
    Object.entries(byEmployee).forEach(([name, { total, days }]) => {
      avg[name] = days.size > 0 ? Math.round(total / days.size) : 0
    })
    return avg
  }, [completedOrders])

  // Build 4 week windows starting from this Monday
  const weeks = useMemo(() => {
    const thisMonday = getMondayOf(new Date())
    return [
      { label: 'This Week',  start: dateStr(thisMonday),            end: dateStr(addDays(thisMonday, 7)) },
      { label: 'Last Week',  start: dateStr(addDays(thisMonday, -7)),  end: dateStr(thisMonday) },
      { label: 'Week 3',     start: dateStr(addDays(thisMonday, -14)), end: dateStr(addDays(thisMonday, -7)) },
      { label: 'Week 4',     start: dateStr(addDays(thisMonday, -21)), end: dateStr(addDays(thisMonday, -14)) },
    ]
  }, [])

  // Group completed orders into weeks → days → employees
  const groupedWeeks = useMemo(() => {
    return weeks.map(week => {
      const weekOrders = completedOrders.filter(o => {
        const d = resolveCompletedDate(o.jobCompletedDate)
        return d && d >= week.start && d < week.end
      })

      const byDate: Record<string, Record<string, { count: number; total: number }>> = {}
      weekOrders.forEach(o => {
        const d = resolveCompletedDate(o.jobCompletedDate)!
        const name = (o.completedBy as string) || '(Unknown)'
        if (!byDate[d]) byDate[d] = {}
        if (!byDate[d][name]) byDate[d][name] = { count: 0, total: 0 }
        byDate[d][name].count++
        byDate[d][name].total += o.orderAmount ?? 0
      })

      const days = Object.entries(byDate)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, empMap]) => ({
          date,
          employees: Object.entries(empMap)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.total - a.total),
        }))

      return { label: week.label, days }
    })
  }, [completedOrders, weeks])

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

      {/* Title */}
      <div className="text-center pb-1 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Team Performance</h1>
      </div>

      {/* Location picker */}
      <div className="flex justify-center pb-4 flex-shrink-0">
        <select
          value={selectedLocationId}
          onChange={e => setSelectedLocationId(e.target.value)}
          className="text-base font-semibold text-blue-500 bg-transparent border-none outline-none cursor-pointer"
        >
          <option value="all">All Locations</option>
          {locations.map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-3 pb-6 flex flex-col gap-4">
          {groupedWeeks.map(week => (
            <div key={week.label} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
              {/* Week header */}
              <div className="bg-gray-100 py-3 text-center border-b border-gray-200">
                <span className="text-base font-bold text-gray-800">{week.label}</span>
              </div>

              {/* Column headers */}
              <div className="flex bg-gray-500 text-white text-xs font-semibold">
                <div className="flex-1 px-4 py-2.5">Employee</div>
                <div className="w-16 px-2 py-2.5 text-center leading-tight">No. of<br />Jobs</div>
                <div className="w-24 px-2 py-2.5 text-right leading-tight">Total<br />Amount</div>
                <div className="w-20 px-2 py-2.5 text-right leading-tight">30-Day<br />Avg</div>
              </div>

              {week.days.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-400 text-sm">No completed jobs</div>
              ) : (
                week.days.map(({ date, employees }) => (
                  <div key={date}>
                    <div className="flex items-center bg-gray-100 border-t border-gray-200 px-4 py-2">
                      <span className="text-sm font-bold text-gray-800 flex-1">{fmtDate(date)}</span>
                      <span className="text-sm font-bold text-gray-800">{fmtDayName(date)}</span>
                    </div>
                    {employees.map((emp, i) => (
                      <div key={i} className="flex items-center border-t border-gray-100 hover:bg-gray-50">
                        <div className="flex-1 px-4 py-3 text-sm text-gray-900">
                          {emp.name === '(Unknown)' ? '' : emp.name.split(' ')[0]}
                        </div>
                        <div className="w-16 px-2 py-3 text-sm text-gray-700 text-center">
                          {emp.count}
                        </div>
                        <div className="w-24 px-2 py-3 text-sm font-medium text-gray-900 text-right">
                          ${Math.round(emp.total).toLocaleString()}
                        </div>
                        <div className="w-20 px-2 py-3 text-sm text-gray-400 text-right">
                          {thirtyDayAvg[emp.name] ? `$${thirtyDayAvg[emp.name].toLocaleString()}` : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
