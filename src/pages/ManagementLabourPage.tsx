import { useEffect, useState, useMemo } from 'react'
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface SignInEvent {
  id: string
  employeeId: string
  employeeName: string
  location: string
  type: 'in' | 'out'
  timestamp: { seconds: number }
}

interface Order {
  id: string
  location: string
  orderAmount: number
  createdAt?: { seconds: number }
}

interface StaffMember {
  id: string
  firstName: string
  lastName: string
  payRate: number
}

function toLocalDateStr(seconds: number) {
  const d = new Date(seconds * 1000)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function getWeekDays(weekOffset: number): { date: string; label: string; short: string }[] {
  const now = new Date()
  const dow = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dow + 6) % 7) + weekOffset * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    return {
      date: dateStr,
      label: d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }),
      short: d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric' }),
    }
  })
}

function getWeekLabel(weekOffset: number) {
  if (weekOffset === 0) return 'This Week'
  if (weekOffset === -1) return 'Last Week'
  const days = getWeekDays(weekOffset)
  const start = new Date(days[0].date + 'T00:00:00')
  const end = new Date(days[6].date + 'T00:00:00')
  return `${start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`
}

export default function ManagementLabourPage() {
  const { accountId } = useAuth()
  const navigate = useNavigate()
  const { locations } = useLocations(accountId)
  const [events, setEvents] = useState<SignInEvent[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [avgEvents, setAvgEvents] = useState<SignInEvent[]>([])
  const [avgOrders, setAvgOrders] = useState<Order[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accountId) return
    load()
  }, [accountId, weekOffset])

  async function load() {
    if (!accountId) return
    setLoading(true)
    const days = getWeekDays(weekOffset)
    const weekStart = new Date(days[0].date + 'T00:00:00')
    const weekEnd = new Date(days[6].date + 'T23:59:59')

    const [eventsSnap, staffSnap, ordersSnap] = await Promise.all([
      getDocs(query(
        collection(db, 'accounts', accountId, 'signIns'),
        where('timestamp', '>=', Timestamp.fromDate(weekStart)),
        where('timestamp', '<=', Timestamp.fromDate(weekEnd))
      )).catch(() => null),
      getDocs(collection(db, 'accounts', accountId, 'staff')).catch(() => null),
      getDocs(query(
        collection(db, 'accounts', accountId, 'orders'),
        where('createdAt', '>=', Timestamp.fromDate(weekStart)),
        where('createdAt', '<=', Timestamp.fromDate(weekEnd))
      )).catch(() => null),
    ])

    if (eventsSnap) setEvents(eventsSnap.docs.map(d => ({ id: d.id, ...d.data() } as SignInEvent)))
    if (staffSnap) setStaff(staffSnap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember)))
    if (ordersSnap) setOrders(ordersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)))

    // Fetch 30-day history for average (rolling 30 days before week start)
    const avg30End = new Date(weekStart); avg30End.setDate(avg30End.getDate() - 1)
    const avg30Start = new Date(avg30End); avg30Start.setDate(avg30End.getDate() - 29)
    const [avgEventsSnap, avgOrdersSnap] = await Promise.all([
      getDocs(query(
        collection(db, 'accounts', accountId, 'signIns'),
        where('timestamp', '>=', Timestamp.fromDate(avg30Start)),
        where('timestamp', '<=', Timestamp.fromDate(avg30End))
      )).catch(() => null),
      getDocs(query(
        collection(db, 'accounts', accountId, 'orders'),
        where('createdAt', '>=', Timestamp.fromDate(avg30Start)),
        where('createdAt', '<=', Timestamp.fromDate(avg30End))
      )).catch(() => null),
    ])
    if (avgEventsSnap) setAvgEvents(avgEventsSnap.docs.map(d => ({ id: d.id, ...d.data() } as SignInEvent)))
    if (avgOrdersSnap) setAvgOrders(avgOrdersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)))
    setLoading(false)
  }

  const days = useMemo(() => getWeekDays(weekOffset), [weekOffset])

  const payRateMap = useMemo(() => {
    const map: Record<string, number> = {}
    staff.forEach(s => {
      map[`${s.firstName} ${s.lastName}`.trim()] = s.payRate ?? 0
    })
    return map
  }, [staff])

  // 30-day average labour % per location
  const avgLabourPct = useMemo(() => {
    const result: Record<string, { pct: number | null; avgStaff: number | null }> = {}
    const locationNames = ['All Locations', ...locations.map(l => l.name)]

    // Build cost per location per day from avgEvents
    const grouped: Record<string, { ins: SignInEvent[]; outs: SignInEvent[]; name: string; location: string }> = {}
    avgEvents.forEach(ev => {
      const date = toLocalDateStr(ev.timestamp.seconds)
      const key = `${ev.employeeId}__${date}`
      if (!grouped[key]) grouped[key] = { ins: [], outs: [], name: ev.employeeName, location: ev.location }
      if (ev.type === 'in') grouped[key].ins.push(ev)
      else grouped[key].outs.push(ev)
    })
    const costByLocDay: Record<string, Record<string, number>> = {}
    Object.values(grouped).forEach(({ ins, outs, name, location }) => {
      const signInTs = ins.length ? Math.min(...ins.map(e => e.timestamp.seconds)) : null
      const signOutTs = outs.length ? Math.max(...outs.map(e => e.timestamp.seconds)) : null
      const hours = (signInTs && signOutTs) ? (signOutTs - signInTs) / 3600 : 0
      const date = ins[0] ? toLocalDateStr(ins[0].timestamp.seconds) : outs[0] ? toLocalDateStr(outs[0].timestamp.seconds) : ''
      const rate = payRateMap[name] ?? 0
      if (!costByLocDay[location]) costByLocDay[location] = {}
      costByLocDay[location][date] = (costByLocDay[location][date] || 0) + hours * rate
    })

    // Revenue per location per day from avgOrders
    const revByLocDay: Record<string, Record<string, number>> = {}
    avgOrders.forEach(o => {
      if (!o.createdAt) return
      const date = toLocalDateStr(o.createdAt.seconds)
      const loc = o.location || ''
      if (!revByLocDay[loc]) revByLocDay[loc] = {}
      revByLocDay[loc][date] = (revByLocDay[loc][date] || 0) + (o.orderAmount || 0)
    })

    // Correct 30D Labour % = total labour cost / total revenue (not average of daily %s)
    locationNames.forEach(loc => {
      const totalCost = loc === 'All Locations'
        ? Object.values(costByLocDay).reduce((sum, byDate) => sum + Object.values(byDate).reduce((a, b) => a + b, 0), 0)
        : Object.values(costByLocDay[loc] || {}).reduce((a, b) => a + b, 0)
      const totalRev = loc === 'All Locations'
        ? Object.values(revByLocDay).reduce((sum, byDate) => sum + Object.values(byDate).reduce((a, b) => a + b, 0), 0)
        : Object.values(revByLocDay[loc] || {}).reduce((a, b) => a + b, 0)
      const pct = totalRev > 0 ? (totalCost / totalRev) * 100 : null

      // Avg daily staff count (only on days with any staff)
      const staffByDate: Record<string, Set<string>> = {}
      avgEvents.forEach(ev => {
        if (loc !== 'All Locations' && ev.location !== loc) return
        const date = toLocalDateStr(ev.timestamp.seconds)
        if (!staffByDate[date]) staffByDate[date] = new Set()
        const key = loc === 'All Locations' ? `${ev.location}__${ev.employeeName}` : (ev.employeeId || ev.employeeName)
        staffByDate[date].add(key)
      })
      const staffCounts = Object.values(staffByDate).map(s => s.size).filter(n => n > 0)
      const avgStaff = staffCounts.length > 0 ? staffCounts.reduce((a, b) => a + b, 0) / staffCounts.length : null

      result[loc] = { pct, avgStaff }
    })
    return result
  }, [avgEvents, avgOrders, payRateMap, locations])

  // Revenue per location × day from orders
  const revenueGrid = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    orders.forEach(o => {
      if (!o.createdAt) return
      const date = toLocalDateStr(o.createdAt.seconds)
      const loc = o.location || ''
      if (!map[loc]) map[loc] = {}
      map[loc][date] = (map[loc][date] || 0) + (o.orderAmount || 0)
    })
    return map
  }, [orders])

  // For each location × day: { staffCount, labourCost }
  const grid = useMemo(() => {
    const locationNames = ['All Locations', ...locations.map(l => l.name)]

    // Group sign-in events by employeeId + date
    const grouped: Record<string, { ins: SignInEvent[]; outs: SignInEvent[]; name: string; location: string }> = {}
    events.forEach(ev => {
      const date = toLocalDateStr(ev.timestamp.seconds)
      const key = `${ev.employeeId}__${date}`
      if (!grouped[key]) grouped[key] = { ins: [], outs: [], name: ev.employeeName, location: ev.location }
      if (ev.type === 'in') grouped[key].ins.push(ev)
      else grouped[key].outs.push(ev)
    })

    // Build shifts: date, location, employeeName, cost
    const shifts: { date: string; location: string; name: string; cost: number }[] = []
    Object.values(grouped).forEach(({ ins, outs, name, location }) => {
      const signInTs = ins.length ? Math.min(...ins.map(e => e.timestamp.seconds)) : null
      const signOutTs = outs.length ? Math.max(...outs.map(e => e.timestamp.seconds)) : null
      const durationHours = (signInTs && signOutTs) ? (signOutTs - signInTs) / 3600 : 0
      const date = ins[0] ? toLocalDateStr(ins[0].timestamp.seconds) : outs[0] ? toLocalDateStr(outs[0].timestamp.seconds) : ''
      const rate = payRateMap[name] ?? 0
      shifts.push({ date, location, name, cost: durationHours * rate })
    })

    // Build result: location → day → { staffCount, labourCost }
    const result: Record<string, Record<string, { staffCount: number; labourCost: number; names: Set<string> }>> = {}
    locationNames.forEach(loc => {
      result[loc] = {}
      days.forEach(d => {
        result[loc][d.date] = { staffCount: 0, labourCost: 0, names: new Set() }
      })
    })

    shifts.forEach(({ date, location, name, cost }) => {
      if (!days.find(d => d.date === date)) return
      if (result[location]?.[date]) {
        result[location][date].names.add(name)
        result[location][date].staffCount = result[location][date].names.size
        result[location][date].labourCost += cost
      }
      if (result['All Locations']?.[date]) {
        result['All Locations'][date].names.add(`${location}__${name}`)
        result['All Locations'][date].staffCount = result['All Locations'][date].names.size
        result['All Locations'][date].labourCost += cost
      }
    })

    return { locationNames, data: result }
  }, [events, payRateMap, locations, days])

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 flex-shrink-0">
        {/* Back button */}
        <button onClick={() => navigate('/mgmt-more')}
          className="flex items-center gap-1.5 text-navy text-sm font-medium mb-2 -ml-1">
          <ArrowLeft size={16} />
          More
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Labour %</h1>
        {/* Week nav */}
        <div className="flex items-center justify-between">
          <button onClick={() => setWeekOffset(w => w - 1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft size={20} className="text-gray-500" />
          </button>
          <span className="text-sm font-semibold text-gray-700">{getWeekLabel(weekOffset)}</span>
          <button onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
            <ChevronRight size={20} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            {/* Section label */}
            <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Staff count · Labour % of revenue</span>
            </div>

            <div className="flex">
              {/* Fixed left: location names */}
              <div className="flex-shrink-0 w-28 border-r border-gray-200">
                <div className="px-3 py-2.5 border-b border-gray-200">
                  <span className="text-xs font-bold text-gray-500">Location</span>
                </div>
                {grid.locationNames.map(loc => (
                  <div key={loc} className="h-14 px-3 border-b border-gray-100 flex items-center">
                    <span className={`text-sm truncate ${loc === 'All Locations' ? 'text-blue-600 font-bold' : 'text-gray-800'}`}>
                      {loc === 'All Locations' ? 'All' : loc}
                    </span>
                  </div>
                ))}
              </div>

              {/* Scrollable right: day columns */}
              <div className="flex-1 overflow-x-auto">
                {/* Column headers */}
                <div className="flex border-b border-gray-200">
                  <div className="w-20 flex-shrink-0 px-2 py-2.5 text-right border-r border-indigo-100 bg-indigo-50">
                    <span className="text-xs font-bold text-indigo-400">30D Avg</span>
                  </div>
                  {days.map(d => (
                    <div key={d.date} className="w-24 flex-shrink-0 px-2 py-2.5 text-right">
                      <span className="text-xs font-bold text-gray-500">{d.short}</span>
                    </div>
                  ))}
                </div>

                {/* Data rows */}
                {grid.locationNames.map(loc => (
                  <div key={loc} className="flex border-b border-gray-100 h-14">
                    {/* 30D Avg column */}
                    {(() => {
                      const avg = avgLabourPct[loc]
                      const pct = avg?.pct ?? null
                      const avgStaff = avg?.avgStaff ?? null
                      const pctColor = pct === null ? '' : pct < 35 ? 'text-emerald-600' : 'text-red-500'
                      return (
                        <div className="w-20 flex-shrink-0 px-2 text-right flex flex-col justify-center border-r border-indigo-100 bg-indigo-50">
                          {avgStaff !== null ? (
                            <p className="text-xs text-gray-500">{avgStaff.toFixed(1)} staff</p>
                          ) : null}
                          {pct !== null ? (
                            <p className={`text-sm font-bold ${pctColor}`}>{Math.round(pct)}%</p>
                          ) : avgStaff === null ? (
                            <p className="text-xs text-gray-200">—</p>
                          ) : null}
                        </div>
                      )
                    })()}
                    {days.map(d => {
                      const cell = grid.data[loc]?.[d.date]
                      const count = cell?.staffCount ?? 0
                      const cost = cell?.labourCost ?? 0
                      // Revenue: sum across all sub-locations if 'All'
                      const revenue = loc === 'All Locations'
                        ? Object.values(revenueGrid).reduce((sum, byDate) => sum + (byDate[d.date] || 0), 0)
                        : (revenueGrid[loc]?.[d.date] ?? 0)
                      const pct = revenue > 0 ? (cost / revenue) * 100 : null
                      const pctColor = pct === null ? '' : pct < 35 ? 'text-emerald-600' : 'text-red-500'
                      const isTotal = loc === 'All Locations'
                      return (
                        <div key={d.date} className="w-24 flex-shrink-0 px-2 text-right flex flex-col justify-center">
                          {count > 0 ? (
                            <>
                              <p className={`text-sm ${isTotal ? 'text-blue-600' : 'text-gray-700'}`}>
                                {count} staff
                              </p>
                              {pct !== null && pct > 0 && (
                                <p className={`text-xs font-semibold mt-0.5 ${pctColor}`}>
                                  {Math.round(pct)}%
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-gray-200">—</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
