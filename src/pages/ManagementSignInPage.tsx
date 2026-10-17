import { useEffect, useState, useMemo } from 'react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { RefreshCw } from 'lucide-react'

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

interface PairedRecord {
  employeeName: string
  location: string
  date: string        // YYYY-MM-DD
  signInTs?: number   // seconds
  signOutTs?: number  // seconds
  pay: number
  isWeekend: boolean
}

function toLocalDateStr(seconds: number) {
  const d = new Date(seconds * 1000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtTime(seconds: number) {
  return new Date(seconds * 1000).toLocaleTimeString('en-AU', {
    hour: 'numeric', minute: '2-digit', hour12: true
  })
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' — ' + d.toLocaleDateString('en-AU', { weekday: 'long' })
}

function getThisWeekRange(): [string, string] {
  const now = new Date()
  const dow = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dow + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return [toLocalDateStr(monday.getTime() / 1000), toLocalDateStr(sunday.getTime() / 1000)]
}

export default function ManagementSignInPage() {
  const { accountId } = useAuth()
  const { locations } = useLocations(accountId)
  const [events, setEvents] = useState<SignInEvent[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState('All Locations')

  async function load() {
    if (!accountId) return
    setLoading(true)

    const [weekStart] = getThisWeekRange()
    // Get timestamp for start of this week
    const weekStartDate = new Date(weekStart + 'T00:00:00')

    const [eventsSnap, staffSnap] = await Promise.all([
      getDocs(query(
        collection(db, 'accounts', accountId, 'signIns'),
        where('timestamp', '>=', { seconds: Math.floor(weekStartDate.getTime() / 1000), nanoseconds: 0 }),
        orderBy('timestamp', 'asc')
      )).catch(() => null),
      getDocs(collection(db, 'accounts', accountId, 'staff')).catch(() => null),
    ])

    if (eventsSnap) setEvents(eventsSnap.docs.map(d => ({ id: d.id, ...d.data() } as SignInEvent)))
    if (staffSnap) setStaff(staffSnap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember)))
    setLoading(false)
  }

  useEffect(() => { load() }, [accountId])

  // Build pay rate map by name
  const payRateMap = useMemo(() => {
    const map: Record<string, number> = {}
    staff.forEach(s => {
      const name = `${s.firstName} ${s.lastName}`.trim()
      map[name] = s.payRate ?? 0
    })
    return map
  }, [staff])

  // Pair in/out events → records
  const records = useMemo<PairedRecord[]>(() => {
    // Group by employeeId + date
    const grouped: Record<string, { ins: SignInEvent[]; outs: SignInEvent[] }> = {}

    events.forEach(ev => {
      const date = toLocalDateStr(ev.timestamp.seconds)
      const key = `${ev.employeeId}__${date}`
      if (!grouped[key]) grouped[key] = { ins: [], outs: [] }
      if (ev.type === 'in') grouped[key].ins.push(ev)
      else grouped[key].outs.push(ev)
    })

    const result: PairedRecord[] = []

    Object.entries(grouped).forEach(([key, { ins, outs }]) => {
      const [, date] = key.split('__')
      const anyEv = ins[0] ?? outs[0]
      const employeeName = anyEv.employeeName
      const location = anyEv.location
      const signInTs = ins.length ? Math.min(...ins.map(e => e.timestamp.seconds)) : undefined
      const signOutTs = outs.length ? Math.max(...outs.map(e => e.timestamp.seconds)) : undefined

      const hours = (signInTs && signOutTs)
        ? (signOutTs - signInTs) / 3600
        : 0

      const isWeekend = new Date(date + 'T00:00:00').getDay() % 6 === 0
      const rate = payRateMap[employeeName] ?? 0
      const pay = Math.round(hours * rate)

      result.push({ employeeName, location, date, signInTs, signOutTs, pay, isWeekend })
    })

    return result.sort((a, b) =>
      a.date === b.date ? a.employeeName.localeCompare(b.employeeName) : b.date.localeCompare(a.date)
    )
  }, [events, payRateMap])

  const filtered = useMemo(() =>
    selectedLocation === 'All Locations' ? records : records.filter(r => r.location === selectedLocation),
    [records, selectedLocation]
  )

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, PairedRecord[]> = {}
    filtered.forEach(r => {
      if (!map[r.date]) map[r.date] = []
      map[r.date].push(r)
    })
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 pt-5 pb-1 flex items-start justify-between flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Sign In Records</h1>
        <button onClick={load} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <RefreshCw size={18} className="text-gray-400" />
        </button>
      </div>

      {/* Location filter */}
      <div className="px-4 py-2 flex-shrink-0">
        <select
          value={selectedLocation}
          onChange={e => setSelectedLocation(e.target.value)}
          className="text-sm font-semibold text-blue-600 bg-transparent border-none outline-none cursor-pointer"
        >
          <option>All Locations</option>
          {locations.map(l => <option key={l.id}>{l.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm mt-12">No sign-in records this week</p>
        ) : (
          <div className="min-w-max">
            {/* This Week header */}
            <div className="bg-gray-200 px-4 py-2 text-center">
              <span className="text-sm font-bold text-gray-700">This Week</span>
            </div>

            {/* Column headers */}
            <div className="flex bg-gray-600 text-white text-xs font-semibold sticky top-0">
              <div className="w-28 px-3 py-2">Name</div>
              <div className="w-24 px-2 py-2 text-center">Sign In</div>
              <div className="w-24 px-2 py-2 text-center">Sign Out</div>
              <div className="w-16 px-2 py-2 text-right">Pay</div>
              <div className="w-28 px-2 py-2 text-right">Location</div>
            </div>

            {grouped.map(([date, rows]) => (
              <div key={date}>
                {/* Date row */}
                <div className="flex px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <span className="text-sm font-bold text-gray-700 mr-4">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                  <span className="text-sm font-bold text-gray-700">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long' })}
                  </span>
                </div>

                {/* Record rows */}
                {rows.map((r, i) => (
                  <div key={i} className="flex border-b border-gray-100 hover:bg-gray-50">
                    <div className="w-28 px-3 py-2.5 text-sm text-gray-900 truncate">{r.employeeName.split(' ')[0]}</div>
                    <div className="w-24 px-2 py-2.5 text-sm text-gray-600 text-center">
                      {r.signInTs ? fmtTime(r.signInTs) : '—'}
                    </div>
                    <div className="w-24 px-2 py-2.5 text-sm text-gray-600 text-center">
                      {r.signOutTs ? fmtTime(r.signOutTs) : '—'}
                    </div>
                    <div className="w-16 px-2 py-2.5 text-sm font-medium text-right">
                      {r.pay > 0 ? `$${r.pay}` : <span className="text-gray-300">$0</span>}
                    </div>
                    <div className="w-28 px-2 py-2.5 text-sm text-gray-500 text-right truncate">{r.location}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
