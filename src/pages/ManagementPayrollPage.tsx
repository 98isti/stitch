import { useEffect, useState, useMemo } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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
  name: string
  firstName: string
  lastName: string
  perHourPayWeekday: number
  perHourPayWEEKEND: number
  payRate?: number
}

function toLocalDateStr(seconds: number) {
  const d = new Date(seconds * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isWeekend(dateStr: string) {
  const day = new Date(dateStr + 'T00:00:00').getDay()
  return day === 0 || day === 6
}

// Get Mon–Sun week containing the given date
function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(date)
  const dow = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((dow + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { start: monday, end: sunday }
}

function fmtWeekLabel(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const s = start.toLocaleDateString('en-AU', opts)
  const e = end.toLocaleDateString('en-AU', opts)
  return `${s} – ${e} ${end.getFullYear()}`
}

function fmtDayLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const weekday = d.toLocaleDateString('en-AU', { weekday: 'long' })
  const date    = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  return { weekday, date }
}

function getDaysInWeek(weekStart: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return toLocalDateStr(d.getTime() / 1000)
  })
}

// Build paired hours per employee per date
function buildHoursMap(events: SignInEvent[]) {
  // Group by employeeId + date
  const grouped: Record<string, { ins: number[]; outs: number[] }> = {}
  events.forEach(ev => {
    const date = toLocalDateStr(ev.timestamp.seconds)
    const key = `${ev.employeeId}__${date}`
    if (!grouped[key]) grouped[key] = { ins: [], outs: [] }
    if (ev.type === 'in') grouped[key].ins.push(ev.timestamp.seconds)
    else grouped[key].outs.push(ev.timestamp.seconds)
  })

  // hours[employeeId][date] = hours worked
  const hours: Record<string, Record<string, number>> = {}
  Object.entries(grouped).forEach(([key, { ins, outs }]) => {
    const [empId, date] = key.split('__')
    const signIn  = ins.length  ? Math.min(...ins)  : null
    const signOut = outs.length ? Math.max(...outs) : null
    const h = (signIn && signOut) ? Math.round(((signOut - signIn) / 3600) * 10) / 10 : 0
    if (!hours[empId]) hours[empId] = {}
    hours[empId][date] = h
  })
  return hours
}

// Get last N weeks (most recent first)
function getWeeks(n: number): { start: Date; end: Date }[] {
  const weeks = []
  const now = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() - i * 7)
    weeks.push(getWeekBounds(d))
  }
  return weeks
}

export default function ManagementPayrollPage() {
  const { accountId } = useAuth()
  const { locations } = useLocations(accountId)
  const navigate = useNavigate()

  const [events, setEvents]   = useState<SignInEvent[]>([])
  const [staff, setStaff]     = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState('All Locations')

  async function load() {
    if (!accountId) return
    setLoading(true)
    const [evSnap, stSnap] = await Promise.all([
      getDocs(collection(db, 'accounts', accountId, 'signIns')).catch(() => null),
      getDocs(collection(db, 'accounts', accountId, 'staff')).catch(() => null),
    ])
    if (evSnap) setEvents(evSnap.docs.map(d => ({ id: d.id, ...d.data() } as SignInEvent)))
    if (stSnap) setStaff(stSnap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember)))
    setLoading(false)
  }

  useEffect(() => { load() }, [accountId])

  // Pay rate map by employeeId
  const rateMap = useMemo(() => {
    const m: Record<string, { weekday: number; weekend: number; name: string }> = {}
    staff.forEach(s => {
      m[s.id] = {
        name: s.name || `${s.firstName} ${s.lastName}`.trim(),
        weekday: s.perHourPayWeekday || s.payRate || 0,
        weekend: s.perHourPayWEEKEND || s.perHourPayWeekday || s.payRate || 0,
      }
    })
    return m
  }, [staff])

  // Filter events by location
  const filteredEvents = useMemo(() =>
    selectedLocation === 'All Locations'
      ? events
      : events.filter(e => e.location === selectedLocation),
    [events, selectedLocation]
  )

  const hoursMap = useMemo(() => buildHoursMap(filteredEvents), [filteredEvents])

  // Which employees have any hours?
  const activeEmployeeIds = useMemo(() => {
    const ids = new Set<string>()
    filteredEvents.forEach(e => ids.add(e.employeeId))
    return [...ids].filter(id => rateMap[id])
      .sort((a, b) => (rateMap[a]?.name || '').localeCompare(rateMap[b]?.name || ''))
  }, [filteredEvents, rateMap])

  const weeks = getWeeks(4)

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-1 bg-white border-b border-gray-100 flex-shrink-0">
        <button onClick={() => navigate('/mgmt-more')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 border border-gray-200">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Payroll</h1>
        <button onClick={load}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 border border-gray-200">
          <RefreshCw size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Location filter */}
      <div className="flex justify-center py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <select
          value={selectedLocation}
          onChange={e => setSelectedLocation(e.target.value)}
          className="text-base font-semibold text-blue-500 bg-transparent border-none outline-none cursor-pointer">
          <option>All Locations</option>
          {locations.map(l => <option key={l.id}>{l.name}</option>)}
        </select>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeEmployeeIds.length === 0 ? (
          <p className="text-center text-gray-400 text-sm mt-12">No sign-in records found</p>
        ) : (
          weeks.map(({ start, end }, wi) => {
            const days = getDaysInWeek(start)
            const isCurrentWeek = wi === 0

            // Only show weeks that have any data
            const hasData = activeEmployeeIds.some(id =>
              days.some(d => (hoursMap[id]?.[d] ?? 0) > 0)
            )
            if (!hasData && !isCurrentWeek) return null

            // Totals per employee
            const weeklyHours: Record<string, number> = {}
            const weeklyPay:   Record<string, number> = {}
            activeEmployeeIds.forEach(id => {
              const rate = rateMap[id]
              let totalH = 0, totalPay = 0
              days.forEach(day => {
                const h = hoursMap[id]?.[day] ?? 0
                const r = isWeekend(day) ? rate.weekend : rate.weekday
                totalH   += h
                totalPay += h * r
              })
              weeklyHours[id] = Math.round(totalH * 10) / 10
              weeklyPay[id]   = Math.round(totalPay * 100) / 100
            })

            return (
              <div key={wi}>
                {/* Week header */}
                <div className="mb-2">
                  <span className="text-sm font-bold text-gray-800">
                    {isCurrentWeek ? 'This Week' : 'Week'} (Mon {fmtWeekLabel(start, end)})
                  </span>
                </div>

                {/* Table — horizontally scrollable */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="text-sm" style={{ minWidth: Math.max(320, 140 + activeEmployeeIds.length * 100) }}>
                      <thead>
                        <tr className="bg-red-50 border-b border-red-100">
                          {/* Day column header */}
                          <th className="text-left px-3 py-3 font-medium text-gray-500 w-36 min-w-36 sticky left-0 z-10 bg-red-50" />
                          {/* Staff columns */}
                          {activeEmployeeIds.map(id => {
                            const rate = rateMap[id]
                            return (
                              <th key={id} className="px-3 py-3 text-center font-semibold text-gray-800 min-w-24">
                                <div>{rate.name.split(' ')[0]}</div>
                                <div className="text-xs font-normal text-gray-400">${rate.weekday}/hr</div>
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {days.map(day => {
                          const weekend = isWeekend(day)
                          const anyWorked = activeEmployeeIds.some(id => (hoursMap[id]?.[day] ?? 0) > 0)
                          return (
                            <tr key={day} className={`border-b border-gray-100 ${weekend ? 'bg-gray-50' : ''}`}>
                              <td className={`px-3 py-2.5 text-sm sticky left-0 z-10 ${weekend ? 'text-gray-500 font-medium bg-gray-50' : 'text-gray-600 bg-white'}`}>
                                <div>{fmtDayLabel(day).weekday}</div>
                                <div className="text-xs text-gray-400 font-normal">{fmtDayLabel(day).date}</div>
                              </td>
                              {activeEmployeeIds.map(id => {
                                const h = hoursMap[id]?.[day]
                                return (
                                  <td key={id} className="px-3 py-2.5 text-center text-base text-gray-700">
                                    {h != null && h > 0 ? h.toFixed(1) : anyWorked ? <span className="text-gray-300">—</span> : ''}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}


                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
