import { useEffect, useState, useMemo } from 'react'
import { collection, getDocs } from 'firebase/firestore'
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
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDayName(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long' })
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

    const [eventsSnap, staffSnap] = await Promise.all([
      getDocs(collection(db, 'accounts', accountId, 'signIns')).catch(() => null),
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
      {/* Refresh button — top right */}
      <div className="flex justify-end px-4 pt-4 flex-shrink-0">
        <button
          onClick={load}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Title */}
      <div className="px-4 pb-2 flex-shrink-0">
        <h1 className="text-3xl font-bold text-gray-900">Sign In Records</h1>
      </div>

      {/* Location filter — centred */}
      <div className="px-4 pb-4 flex justify-center flex-shrink-0">
        <select
          value={selectedLocation}
          onChange={e => setSelectedLocation(e.target.value)}
          className="text-base font-semibold text-blue-500 bg-transparent border-none outline-none cursor-pointer"
        >
          <option>All Locations</option>
          {locations.map(l => <option key={l.id}>{l.name}</option>)}
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-2">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm mt-12">No sign-in records this week</p>
        ) : (
          /* Card wrapping the whole table */
          <div className="rounded-xl border border-gray-200 shadow-sm" style={{ overflow: 'clip' }}>
            {/* "This Week" section header — sticky at very top */}
            <div className="sticky top-0 z-30 bg-gray-100 px-4 py-2 text-center border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-700">This Week</span>
            </div>

            <table className="w-full text-sm">
                {/* Column headers — sticky below "This Week" bar */}
                <thead>
                  <tr className="bg-gray-500 text-white sticky top-[37px] z-20">
                    <th className="px-2 py-2 text-left font-semibold w-28">Name</th>
                    <th className="px-2 py-2 text-center font-semibold w-20 leading-tight">
                      Sign in<br />Time
                    </th>
                    <th className="px-2 py-2 text-center font-semibold w-20 leading-tight">
                      Sign out<br />Time
                    </th>
                    <th className="px-2 py-2 text-right font-semibold">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map(([date, rows]) => (
                    <>
                      {/* Date separator — sticky below column headers */}
                      <tr key={`date-${date}`} className="bg-gray-100 border-t border-gray-200 sticky top-[85px] z-10">
                        <td colSpan={2} className="px-3 py-2 font-bold text-gray-800 text-sm">
                          {fmtDate(date)}
                        </td>
                        <td colSpan={2} className="px-2 py-2 font-bold text-gray-800 text-sm text-right">
                          {fmtDayName(date)}
                        </td>
                      </tr>

                      {/* Record rows */}
                      {rows.map((r, i) => (
                        <tr key={`${date}-${i}`} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-2 py-2.5 text-gray-900 font-medium truncate max-w-[112px]">
                            {r.employeeName.split(' ')[0]}
                          </td>
                          <td className="px-2 py-2.5 text-gray-600 text-center whitespace-nowrap">
                            {r.signInTs ? fmtTime(r.signInTs) : ''}
                          </td>
                          <td className="px-2 py-2.5 text-gray-600 text-center whitespace-nowrap">
                            {r.signOutTs ? fmtTime(r.signOutTs) : ''}
                          </td>
                          <td className="px-2 py-2.5 text-gray-500 text-right truncate">
                            {r.location}
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom padding for nav bar */}
      <div className="h-2 flex-shrink-0" />
    </div>
  )
}
