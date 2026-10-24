import { useEffect, useState, useMemo } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'

interface Payment { amount: number; paidDate: string; location: string }
interface SignIn {
  employeeId: string
  employeeName: string
  location: string
  type: 'in' | 'out'
  timestamp: { seconds: number }
}
interface StaffMember { firstName: string; lastName: string; payRate: number }

// ── Date helpers ──────────────────────────────────────────────────────────────

function toStr(d: Date) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function dayStr(daysAgo: number) { return toStr(addDays(new Date(), -daysAgo)) }

function weekRange(weeksAgo: number): [string, string] {
  const now = new Date()
  const monday = addDays(now, -(((now.getDay() + 6) % 7) + weeksAgo * 7))
  return [toStr(monday), toStr(addDays(monday, 6))]
}

function monthRange(monthsAgo: number): [string, string] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
  const end   = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0)
  return [toStr(start), toStr(end)]
}

function daysInRange(start: string, end: string): number {
  return Math.round((new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()) / 86400000) + 1
}

// ── Revenue calculator ────────────────────────────────────────────────────────

function sumPayments(payments: Payment[], location: string | null, dates: string[] | null, range: [string, string] | null): number {
  return payments.reduce((sum, p) => {
    if (location && p.location !== location) return sum
    if (dates && !dates.includes(p.paidDate)) return sum
    if (range && (p.paidDate < range[0] || p.paidDate > range[1])) return sum
    return sum + p.amount
  }, 0)
}

// ── Labour cost calculator ────────────────────────────────────────────────────

function calcLabourCost(
  signIns: SignIn[],
  payRateMap: Record<string, number>,
  location: string | null,
  start: string,
  end: string
): number {
  const toDateStr = (s: number) => {
    const d = new Date(s * 1000)
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
  }

  const filtered = signIns.filter(ev => {
    if (location && ev.location !== location) return false
    const date = toDateStr(ev.timestamp?.seconds ?? 0)
    return date >= start && date <= end
  })

  const grouped: Record<string, { ins: number[]; outs: number[]; name: string }> = {}
  filtered.forEach(ev => {
    const sec = ev.timestamp?.seconds ?? 0
    const date = toDateStr(sec)
    const key = (ev.employeeId || ev.employeeName) + '__' + date + '__' + ev.location
    if (!grouped[key]) grouped[key] = { ins: [], outs: [], name: ev.employeeName ?? '' }
    if (ev.type === 'in') grouped[key].ins.push(sec)
    else grouped[key].outs.push(sec)
  })

  let total = 0
  Object.values(grouped).forEach(({ ins, outs, name }) => {
    const inTs  = ins.length  ? Math.min(...ins)  : null
    const outTs = outs.length ? Math.max(...outs) : null
    const hours = (inTs && outTs) ? (outTs - inTs) / 3600 : 0
    total += hours * (payRateMap[name] ?? 40)
  })
  return total
}

// ── P/L calculator ────────────────────────────────────────────────────────────

function calcPL(
  revenue: number,
  signIns: SignIn[],
  payRateMap: Record<string, number>,
  locName: string | null,
  start: string,
  end: string,
  expenses: Record<string, { dailyRent: number; dailyOther: number }>
): number | null {
  // No revenue = shop wasn't open in this period, skip P/L
  if (revenue === 0) return null

  // Cap end at today — current periods should show P/L to date, not full projected period
  const today = toStr(new Date())
  const effectiveEnd = end > today ? today : end

  const days = daysInRange(start, effectiveEnd)
  const fixedPerDay = locName
    ? (expenses[locName]?.dailyRent ?? 0) + (expenses[locName]?.dailyOther ?? 0)
    : Object.values(expenses).reduce((s, e) => s + e.dailyRent + e.dailyOther, 0)
  const labour = calcLabourCost(signIns, payRateMap, locName, start, effectiveEnd)
  return revenue - fixedPerDay * days - labour
}

// ── Format helpers ────────────────────────────────────────────────────────────

function fmt(n: number) { return '$' + Math.abs(Math.round(n)).toLocaleString('en-AU') }

function PLBadge({ pl }: { pl: number | null }) {
  if (pl === null) return null
  const pos = pl >= 0
  return (
    <p className={`text-sm mt-0.5 ${pos ? 'text-emerald-600' : 'text-red-500'}`}>
      ({pos ? '+' : '-'}{fmt(pl)})
    </p>
  )
}

// ── Table section ─────────────────────────────────────────────────────────────

interface Row { name: string; isTotal: boolean; values: number[]; pl: (number | null)[] }

function TableSection({ label, rows, columns, showPL = true }: {
  label: string
  rows: Row[]
  columns: { label: string }[]
  showPL?: boolean
}) {
  return (
    <div className="mb-4 bg-white rounded-xl overflow-hidden border border-gray-100">
      <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
        <span className="text-base font-bold text-gray-500 uppercase tracking-widest">{label}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: `${140 + columns.length * 110}px` }}>
          <thead>
            <tr className="border-b border-gray-200 bg-white">
              <th className="sticky left-0 z-10 bg-white px-3 py-2.5 text-left border-r border-gray-200 w-32">
                <span className="text-base font-bold text-gray-500">Location</span>
              </th>
              {columns.map((col, i) => (
                <th key={i} className="px-2 py-2.5 text-right min-w-[110px]">
                  <span className="text-base font-bold text-gray-500 whitespace-nowrap">{col.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.name} className="border-b border-gray-100">
                <td className="sticky left-0 z-10 bg-white px-3 py-2.5 border-r border-gray-200 w-32">
                  <span className={`text-lg leading-snug whitespace-nowrap ${row.isTotal ? 'text-blue-600 font-bold' : 'text-gray-800 font-medium'}`}>
                    {row.name}
                  </span>
                </td>
                {row.values.map((val, i) => (
                  <td key={i} className="px-2 py-2.5 text-right align-top min-w-[110px]">
                    <p className={`text-lg ${row.isTotal ? 'text-blue-600 font-bold' : val === 0 ? 'text-gray-300' : 'text-gray-900'}`}>
                      {fmt(val)}
                    </p>
                    {showPL && <PLBadge pl={row.pl[i] ?? null} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ManagementReportPage() {
  const { accountId } = useAuth()
  const { locations } = useLocations(accountId)
  const [payments, setPayments]   = useState<Payment[]>([])
  const [signIns, setSignIns]     = useState<SignIn[]>([])
  const [staff, setStaff]         = useState<StaffMember[]>([])
  const [loading, setLoading]     = useState(true)
  const [showLifetime, setShowLifetime]         = useState(false)
  const [lifetimePayments, setLifetimePayments] = useState<Payment[]>([])
  const [lifetimeSignIns, setLifetimeSignIns]   = useState<SignIn[]>([])
  const [loadingLifetime, setLoadingLifetime]   = useState(false)

  useEffect(() => {
    if (!accountId) return
    const cutoff = toStr(addDays(new Date(), -150))
    Promise.all([
      getDocs(query(collection(db, 'accounts', accountId, 'payments'), where('paidDate', '>=', cutoff))),
      getDocs(collection(db, 'accounts', accountId, 'staff')),
      // sign-ins: Firestore Timestamp comparison — use ISO date cutoff via string workaround:
      // fetch all and filter client-side to avoid Timestamp import
      getDocs(collection(db, 'accounts', accountId, 'signIns')),
    ]).then(([pmtSnap, staffSnap, siSnap]) => {
      setPayments(pmtSnap.docs.map(d => d.data() as Payment))
      setStaff(staffSnap.docs.map(d => d.data() as StaffMember))
      const cutoffSec = new Date(cutoff + 'T00:00:00').getTime() / 1000
      setSignIns(siSnap.docs.map(d => d.data() as SignIn).filter(s => (s.timestamp?.seconds ?? 0) >= cutoffSec))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [accountId])

  async function loadLifetime() {
    if (!accountId || loadingLifetime) return
    setLoadingLifetime(true)
    const [pmtSnap, siSnap] = await Promise.all([
      getDocs(collection(db, 'accounts', accountId, 'payments')).catch(() => null),
      getDocs(collection(db, 'accounts', accountId, 'signIns')).catch(() => null),
    ])
    if (pmtSnap) setLifetimePayments(pmtSnap.docs.map(d => d.data() as Payment))
    if (siSnap)  setLifetimeSignIns(siSnap.docs.map(d => d.data() as SignIn))
    setShowLifetime(true)
    setLoadingLifetime(false)
  }

  const locationNames = useMemo(() => locations.map(l => l.name), [locations])

  const payRateMap = useMemo(() => {
    const map: Record<string, number> = {}
    staff.forEach(s => {
      map[`${s.firstName ?? ''} ${s.lastName ?? ''}`.trim()] = s.payRate ?? 40
    })
    return map
  }, [staff])

  const locationExpenses = useMemo(() => {
    const map: Record<string, { dailyRent: number; dailyOther: number }> = {}
    locations.forEach(loc => {
      map[loc.name] = {
        dailyRent:  (loc as any).dailyRent  ?? 0,
        dailyOther: (loc as any).dailyOther ?? 0,
      }
    })
    return map
  }, [locations])

  const activePmts = showLifetime ? lifetimePayments : payments
  const activeSIs  = showLifetime ? lifetimeSignIns  : signIns

  const data = useMemo(() => {
    const locs = ['All Locations', ...locationNames]

    function buildRows(
      periods: [string, string][],
      showPL: boolean
    ): Row[] {
      return locs.map(loc => {
        const locKey = loc === 'All Locations' ? null : loc
        const values = periods.map(([s, e]) => sumPayments(activePmts, locKey, null, [s, e]))
        const pl = showPL
          ? periods.map(([s, e], i) => calcPL(values[i], activeSIs, payRateMap, locKey, s, e, locationExpenses))
          : periods.map(() => null)
        return { name: loc, isTotal: loc === 'All Locations', values, pl }
      })
    }

    // Daily (no P/L)
    const dailyPeriods: [string, string][] = [0,1,2,3].map(d => [dayStr(d), dayStr(d)])
    const dailyRows = buildRows(dailyPeriods, false)
    const dailyCols = [{ label: 'Today' }, { label: 'Yesterday' }, { label: '2 Days Ago' }, { label: '3 Days Ago' }]

    // Weekly
    const weeklyPeriods: [string, string][] = [0,1,2,3].map(w => weekRange(w))
    const weeklyRows = buildRows(weeklyPeriods, true)
    const weeklyCols = [{ label: 'This Week' }, { label: 'Last Week' }, { label: '2 Weeks Ago' }, { label: '3 Weeks Ago' }]

    // Monthly
    const monthlyPeriods: [string, string][] = [0,1,2,3].map(m => monthRange(m))
    const monthlyRows = buildRows(monthlyPeriods, true)
    const monthlyCols = [{ label: 'This Month' }, { label: 'Last Month' }, { label: '2 Months Ago' }, { label: '3 Months Ago' }]

    // Yearly
    const now = new Date()
    const yearlyPeriods: [string, string][] = [0,1,2].map(y => [
      `${now.getFullYear()-y}-01-01`,
      `${now.getFullYear()-y}-12-31`,
    ])
    yearlyPeriods.push(['2000-01-01', '2099-12-31']) // lifetime
    const yearlyRows = buildRows(yearlyPeriods, true)
    const yearlyCols = [{ label: 'This Year' }, { label: 'Last Year' }, { label: '2 Years Ago' }, { label: 'Lifetime' }]

    return { dailyRows, dailyCols, weeklyRows, weeklyCols, monthlyRows, monthlyCols, yearlyRows, yearlyCols }
  }, [activePmts, activeSIs, locationNames, payRateMap, locationExpenses])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Report</h1>
        <p className="text-xs text-gray-400 mt-0.5">Revenue + P/L (rent + other + actual labour)</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <TableSection label="Daily"   rows={data.dailyRows}   columns={data.dailyCols}   showPL={false} />
        <TableSection label="Weekly"  rows={data.weeklyRows}  columns={data.weeklyCols}  showPL={true} />
        <TableSection label="Monthly" rows={data.monthlyRows} columns={data.monthlyCols} showPL={true} />

        {showLifetime ? (
          <TableSection label="Yearly" rows={data.yearlyRows} columns={data.yearlyCols} showPL={true} />
        ) : (
          <div className="mt-2 pb-8">
            <button onClick={loadLifetime} disabled={loadingLifetime}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
              {loadingLifetime ? 'Loading…' : 'Load Lifetime Data'}
            </button>
            <p className="text-xs text-red-500 mt-2">⚠️ This will take some time and may slow the app.</p>
          </div>
        )}
      </div>
    </div>
  )
}
