import { useEffect, useState, useMemo } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Order {
  id: string
  servedBy?: string
  orderAmount: number
  locationId?: string
  createdAt?: { seconds: number }
  jobCompletedDate?: { seconds: number } | string | null
}

function dateStrFromWeekStart(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Resolve jobCompletedDate (Timestamp or string) → YYYY-MM-DD, or null
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

function getWeekStart() {
  const now = new Date()
  const dow = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dow + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  return monday
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

  const now = new Date()
  const weekStart = getWeekStart()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)

  const weekStartStr  = dateStrFromWeekStart(weekStart)
  const thirtyDaysStr = dateStrFromWeekStart(thirtyDaysAgo)

  // Completed orders only — completedBy is set when staff mark job as Ready for Pickup
  const completedOrders = useMemo(() =>
    filteredOrders.filter(o => !!(o as any).completedBy)
  , [filteredOrders])

  // This week: completed this week
  const thisWeekOrders = useMemo(() =>
    completedOrders.filter(o => (resolveCompletedDate(o.jobCompletedDate) ?? '') >= weekStartStr)
  , [completedOrders, weekStartStr])

  // Last 30 days completed (for avg)
  const last30Orders = useMemo(() =>
    completedOrders.filter(o => (resolveCompletedDate(o.jobCompletedDate) ?? '') >= thirtyDaysStr)
  , [completedOrders, thirtyDaysStr])

  // 30-day total per employee → weekly avg (÷ 4.3 weeks)
  const thirtyDayAvg = useMemo(() => {
    const totals: Record<string, number> = {}
    last30Orders.forEach(o => {
      const name = (o as any).completedBy || ''
      if (!name) return
      totals[name] = (totals[name] ?? 0) + (o.orderAmount ?? 0)
    })
    const avg: Record<string, number> = {}
    Object.entries(totals).forEach(([name, total]) => {
      avg[name] = Math.round(total / (30 / 7))
    })
    return avg
  }, [last30Orders])

  // Group this week by job completion date → employee
  const groupedByDate = useMemo(() => {
    const byDate: Record<string, Record<string, { count: number; total: number }>> = {}

    thisWeekOrders.forEach(o => {
      const date = resolveCompletedDate(o.jobCompletedDate)!
      const name = (o as any).completedBy || '(Unknown)'
      if (!byDate[date]) byDate[date] = {}
      if (!byDate[date][name]) byDate[date][name] = { count: 0, total: 0 }
      byDate[date][name].count++
      byDate[date][name].total += o.orderAmount ?? 0
    })

    // Sort dates descending, employees by total descending
    return Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, empMap]) => ({
        date,
        employees: Object.entries(empMap)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.total - a.total)
      }))
  }, [thisWeekOrders])

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

      {/* Location picker — centred */}
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

      {/* Table card */}
      <div className="px-3 pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
            {/* "This Week" header */}
            <div className="bg-gray-100 py-3 text-center border-b border-gray-200">
              <span className="text-base font-bold text-gray-800">This Week</span>
            </div>

            {/* Column headers */}
            <div className="flex bg-gray-500 text-white text-xs font-semibold">
              <div className="flex-1 px-4 py-2.5">Employee</div>
              <div className="w-16 px-2 py-2.5 text-center leading-tight">No. of<br />Jobs</div>
              <div className="w-24 px-2 py-2.5 text-right leading-tight">Total<br />Amount</div>
              <div className="w-20 px-2 py-2.5 text-right leading-tight">30-Day<br />Avg</div>
            </div>

            {groupedByDate.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                No orders this week
              </div>
            ) : (
              groupedByDate.map(({ date, employees }) => (
                <div key={date}>
                  {/* Date separator */}
                  <div className="flex items-center bg-gray-100 border-t border-gray-200 px-4 py-2">
                    <span className="text-sm font-bold text-gray-800 flex-1">{fmtDate(date)}</span>
                    <span className="text-sm font-bold text-gray-800">{fmtDayName(date)}</span>
                  </div>

                  {/* Employee rows */}
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
        )}
      </div>
    </div>
  )
}
