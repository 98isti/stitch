import { useEffect, useState, useMemo } from 'react'
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface SignInEvent {
  id: string
  employeeId: string
  employeeName: string
  location: string
  type: 'in' | 'out'
  timestamp: { seconds: number }
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
  const { locations } = useLocations(accountId)
  const [events, setEvents] = useState<SignInEvent[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
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

    const [eventsSnap, staffSnap] = await Promise.all([
      getDocs(query(
        collection(db, 'accounts', accountId, 'signIns'),
        where('timestamp', '>=', Timestamp.fromDate(weekStart)),
        where('timestamp', '<=', Timestamp.fromDate(weekEnd))
      )).catch(() => null),
      getDocs(collection(db, 'accounts', accountId, 'staff')).catch(() => null),
    ])

    if (eventsSnap) setEvents(eventsSnap.docs.map(d => ({ id: d.id, ...d.data() } as SignInEvent)))
    if (staffSnap) setStaff(staffSnap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember)))
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
      // specific location
      if (result[location]?.[date]) {
        result[location][date].names.add(name)
        result[location][date].staffCount = result[location][date].names.size
        result[location][date].labourCost += cost
      }
      // All Locations
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
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Labour</h1>
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
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Staff · Cost</span>
            </div>

            <div className="flex">
              {/* Fixed left: location names */}
              <div className="flex-shrink-0 w-28 border-r border-gray-200">
                <div className="px-3 py-2.5 border-b border-gray-200">
                  <span className="text-xs font-bold text-gray-500">Location</span>
                </div>
                {grid.locationNames.map(loc => (
                  <div key={loc} className="px-3 py-3 border-b border-gray-100 min-h-[52px] flex items-center">
                    <span className={`text-sm leading-tight ${loc === 'All Locations' ? 'text-blue-600 font-bold' : 'text-gray-800'}`}>
                      {loc}
                    </span>
                  </div>
                ))}
              </div>

              {/* Scrollable right: day columns */}
              <div className="flex-1 overflow-x-auto">
                {/* Column headers */}
                <div className="flex border-b border-gray-200">
                  {days.map(d => (
                    <div key={d.date} className="w-24 flex-shrink-0 px-2 py-2.5 text-right">
                      <span className="text-xs font-bold text-gray-500">{d.short}</span>
                    </div>
                  ))}
                </div>

                {/* Data rows */}
                {grid.locationNames.map(loc => (
                  <div key={loc} className="flex border-b border-gray-100 min-h-[52px]">
                    {days.map(d => {
                      const cell = grid.data[loc]?.[d.date]
                      const count = cell?.staffCount ?? 0
                      const cost = cell?.labourCost ?? 0
                      const isTotal = loc === 'All Locations'
                      return (
                        <div key={d.date} className="w-24 flex-shrink-0 px-2 py-2.5 text-right flex flex-col justify-center">
                          {count > 0 ? (
                            <>
                              <p className={`text-sm font-semibold ${isTotal ? 'text-blue-600' : 'text-gray-900'}`}>
                                {count} {count === 1 ? 'staff' : 'staff'}
                              </p>
                              {cost > 0 && (
                                <p className="text-xs text-gray-400 mt-0.5">${Math.round(cost)}</p>
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
