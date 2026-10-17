import { useEffect, useState, useMemo } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'

interface Payment { amount: number; paidDate: string; location: string }

// ── Date helpers ──────────────────────────────────────────────────────────────

function toStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate()+n); return r }

function dayStr(daysAgo: number) {
  return toStr(addDays(new Date(), -daysAgo))
}

function weekRange(weeksAgo: number): [string, string] {
  const now = new Date()
  const dow = now.getDay() // 0=Sun
  const monday = addDays(now, -(((dow + 6) % 7) + weeksAgo * 7))
  const sunday = addDays(monday, 6)
  return [toStr(monday), toStr(sunday)]
}

function monthRange(monthsAgo: number): [string, string] {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() - monthsAgo
  const start = new Date(y, m, 1)
  const end = new Date(y, m + 1, 0)
  return [toStr(start), toStr(end)]
}

// ── Revenue calculator ────────────────────────────────────────────────────────

function sumPayments(payments: Payment[], location: string | null, dates: string[] | null, range: [string,string] | null): number {
  return payments.reduce((sum, p) => {
    if (location && p.location !== location) return sum
    if (dates && !dates.includes(p.paidDate)) return sum
    if (range && (p.paidDate < range[0] || p.paidDate > range[1])) return sum
    return sum + p.amount
  }, 0)
}

// ── Format helpers ────────────────────────────────────────────────────────────

function fmt(n: number) { return '$' + Math.round(n).toLocaleString('en-AU') }


function Delta({ current, prev }: { current: number; prev: number }) {
  if (prev === 0 && current === 0) return null
  const delta = current - prev
  if (delta === 0) return null
  const color = delta >= 0 ? 'text-emerald-600' : 'text-red-500'
  return <p className={`text-xs ${color} mt-0.5`}>({delta >= 0 ? '+' : ''}{fmt(delta)})</p>
}

// ── Table section ─────────────────────────────────────────────────────────────

function TableSection({ label, rows, columns }: {
  label: string
  rows: Array<{ name: string; isTotal: boolean; values: number[] }>
  columns: { label: string }[]
}) {
  // Two-panel layout: fixed location column + independently scrollable value columns
  return (
    <div className="mb-4 bg-white rounded-xl overflow-hidden border border-gray-100">
      {/* Section label */}
      <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</span>
      </div>

      <div className="flex">
        {/* Fixed left: location names */}
        <div className="flex-shrink-0 w-28 border-r border-gray-200">
          <div className="px-3 py-2.5 border-b border-gray-200">
            <span className="text-xs font-bold text-gray-500">Location</span>
          </div>
          {rows.map(row => (
            <div key={row.name} className="px-3 py-3 border-b border-gray-100 min-h-[52px] flex items-center">
              <span className={`text-sm leading-tight ${row.isTotal ? 'text-blue-600 font-bold' : 'text-gray-800'}`}>
                {row.name}
              </span>
            </div>
          ))}
        </div>

        {/* Scrollable right: value columns */}
        <div className="flex-1 overflow-x-auto">
          {/* Column headers */}
          <div className="flex border-b border-gray-200">
            {columns.map((col, i) => (
              <div key={i} className="w-28 flex-shrink-0 px-2 py-2.5 text-right">
                <span className="text-xs font-bold text-gray-500">{col.label}</span>
              </div>
            ))}
          </div>
          {/* Value rows */}
          {rows.map(row => (
            <div key={row.name} className="flex border-b border-gray-100 min-h-[52px]">
              {row.values.map((val, i) => {
                const prev = i < row.values.length - 1 ? row.values[i + 1] : 0
                return (
                  <div key={i} className="w-28 flex-shrink-0 px-2 py-2.5 text-right flex flex-col justify-center">
                    <p className={`text-sm font-semibold ${row.isTotal ? 'text-blue-600' : val === 0 ? 'text-gray-300' : 'text-gray-900'}`}>
                      {fmt(val)}
                    </p>
                    {val > 0 && <Delta current={val} prev={prev} />}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ManagementReportPage() {
  const { accountId } = useAuth()
  const { locations } = useLocations(accountId)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [showLifetime, setShowLifetime] = useState(false)
  const [lifetimePayments, setLifetimePayments] = useState<Payment[]>([])
  const [loadingLifetime, setLoadingLifetime] = useState(false)

  useEffect(() => {
    if (!accountId) return
    // Load last 5 months of payments (enough for 4 month columns)
    const cutoff = toStr(addDays(new Date(), -150))
    getDocs(query(
      collection(db, 'accounts', accountId, 'payments'),
      where('paidDate', '>=', cutoff)
    )).then(snap => {
      setPayments(snap.docs.map(d => d.data() as Payment))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [accountId])

  async function loadLifetime() {
    if (!accountId || loadingLifetime) return
    setLoadingLifetime(true)
    const snap = await getDocs(collection(db, 'accounts', accountId, 'payments')).catch(() => null)
    if (snap) setLifetimePayments(snap.docs.map(d => d.data() as Payment))
    setShowLifetime(true)
    setLoadingLifetime(false)
  }

  const locationNames = useMemo(() => locations.map(l => l.name), [locations])

  // Build rows for each section
  const data = useMemo(() => {
    const allPmts = showLifetime ? lifetimePayments : payments
    const locs = ['All Locations', ...locationNames]

    function rowValues(fn: (loc: string | null) => number[]) {
      return locs.map(loc => ({
        name: loc,
        isTotal: loc === 'All Locations',
        values: fn(loc === 'All Locations' ? null : loc),
      }))
    }

    // Daily: Today, Yesterday, 2 days ago, 3 days ago
    const dailyRows = rowValues(loc => [0,1,2,3].map(d => sumPayments(payments, loc, [dayStr(d)], null)))
    const dailyCols = [{ label: 'Today' }, { label: 'Yesterday' }, { label: '2 days ago' }, { label: '3 days ago' }]

    // Weekly: This Week, Last Week, Week 3, Week 4
    const weeklyRows = rowValues(loc => [0,1,2,3].map(w => sumPayments(payments, loc, null, weekRange(w))))
    const weeklyCols = [{ label: 'This Week' }, { label: 'Last Week' }, { label: 'Week 3' }, { label: 'Week 4' }]

    // Monthly: This Month, Last Month, Month 3, Month 4
    const monthlyRows = rowValues(loc => [0,1,2,3].map(m => sumPayments(payments, loc, null, monthRange(m))))
    const monthlyCols = [{ label: 'This Month' }, { label: 'Last Month' }, { label: 'Month 3' }, { label: 'Month 4' }]

    // Yearly + Lifetime
    const yearlyRows = rowValues(loc => {
      const now = new Date()
      const years = [0,1,2].map(y => sumPayments(allPmts, loc, null, [`${now.getFullYear()-y}-01-01`, `${now.getFullYear()-y}-12-31`]))
      const lifetime = sumPayments(allPmts, loc, null, ['2000-01-01', '2099-12-31'])
      return [...years, lifetime]
    })
    const yearlyCols = [{ label: 'This Year' }, { label: 'Last Year' }, { label: '3 Years Ago' }, { label: 'Lifetime' }]

    return { dailyRows, dailyCols, weeklyRows, weeklyCols, monthlyRows, monthlyCols, yearlyRows, yearlyCols }
  }, [payments, locationNames, showLifetime, lifetimePayments])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Report</h1>
      </div>

      {/* Vertically scrollable page, inner panels scroll horizontally */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div>
          <TableSection label="Daily" rows={data.dailyRows} columns={data.dailyCols} />
          <TableSection label="Weekly" rows={data.weeklyRows} columns={data.weeklyCols} />
          <TableSection label="Monthly" rows={data.monthlyRows} columns={data.monthlyCols} />

          {showLifetime ? (
            <TableSection label="Yearly" rows={data.yearlyRows} columns={data.yearlyCols} />
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
    </div>
  )
}
