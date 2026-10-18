import { useEffect, useState, useMemo } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Payment {
  amount: number
  paidDate: string   // YYYY-MM-DD
  location: string
  locationId?: string
}

type FilterKey = '7d' | '30d' | '90d' | 'thisMonth' | 'lastMonth' | 'thisYear'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: '7d',        label: 'Last 7 Days' },
  { key: '30d',       label: 'Last 30 Days' },
  { key: '90d',       label: 'Last 90 Days' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'thisYear',  label: 'This Year' },
]

function getDateRange(filter: FilterKey): { start: Date; end: Date; days: number } {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let start: Date, end: Date

  switch (filter) {
    case '7d':
      start = new Date(today); start.setDate(today.getDate() - 6)
      end = new Date(today)
      break
    case '30d':
      start = new Date(today); start.setDate(today.getDate() - 29)
      end = new Date(today)
      break
    case '90d':
      start = new Date(today); start.setDate(today.getDate() - 89)
      end = new Date(today)
      break
    case 'thisMonth':
      start = new Date(today.getFullYear(), today.getMonth(), 1)
      end = new Date(today)
      break
    case 'lastMonth': {
      const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      start = lm
      end = new Date(today.getFullYear(), today.getMonth(), 0)
      break
    }
    case 'thisYear':
      start = new Date(today.getFullYear(), 0, 1)
      end = new Date(today)
      break
  }

  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  return { start, end, days }
}

function toYMD(d: Date) {
  return d.toISOString().split('T')[0]
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtMoney(n: number) {
  if (n >= 1000) return '$' + Math.round(n).toLocaleString()
  return '$' + Math.round(n)
}

export default function AvgSalesPage() {
  const { accountId } = useAuth()
  const { locations }  = useLocations(accountId)
  const navigate       = useNavigate()

  const [payments, setPayments] = useState<Payment[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<FilterKey>('30d')

  async function load() {
    if (!accountId) return
    setLoading(true)
    const snap = await getDocs(
      collection(db, 'accounts', accountId, 'payments')
    ).catch(() => null)
    if (snap) setPayments(snap.docs.map(d => ({ ...d.data() } as Payment)))
    setLoading(false)
  }

  useEffect(() => { load() }, [accountId])

  const { start, end, days } = useMemo(() => getDateRange(filter), [filter])
  const startStr = toYMD(start)
  const endStr   = toYMD(end)
  const weeks    = days / 7
  const months   = days / 30.44

  // Filter payments to date range
  const inRange = useMemo(() =>
    payments.filter(p => p.paidDate >= startStr && p.paidDate <= endStr),
    [payments, startStr, endStr]
  )

  // Per-location totals
  const locationStats = useMemo(() => {
    const totals: Record<string, number> = {}
    inRange.forEach(p => {
      const loc = p.location || ''
      if (!loc) return
      totals[loc] = (totals[loc] || 0) + (p.amount || 0)
    })

    return locations
      .filter(l => totals[l.name] != null)
      .map(l => {
        const total   = totals[l.name] || 0
        return {
          name:        l.name,
          total,
          monthlyAvg:  total / months,
          weeklyAvg:   total / weeks,
          dailyAvg:    total / days,
        }
      })
      .sort((a, b) => b.total - a.total)
  }, [inRange, locations, days, weeks, months])

  // Grand totals
  const grand = useMemo(() => ({
    total:      locationStats.reduce((s, l) => s + l.total, 0),
    monthlyAvg: locationStats.reduce((s, l) => s + l.monthlyAvg, 0),
    weeklyAvg:  locationStats.reduce((s, l) => s + l.weeklyAvg, 0),
    dailyAvg:   locationStats.reduce((s, l) => s + l.dailyAvg, 0),
  }), [locationStats])

  const ROWS: { label: string; key: keyof typeof grand }[] = [
    { label: 'Total Sales',  key: 'total' },
    { label: 'Monthly Avg',  key: 'monthlyAvg' },
    { label: 'Weekly Avg',   key: 'weeklyAvg' },
    { label: 'Daily Avg',    key: 'dailyAvg' },
  ]

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 bg-white border-b border-gray-100 flex-shrink-0">
        <button onClick={() => navigate('/mgmt-more')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 border border-gray-200">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-base font-bold text-gray-900">Avg Sales by Location</h1>
        <button onClick={load}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 border border-gray-200">
          <RefreshCw size={16} className="text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Filter card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-4 py-4">
          <p className="text-sm font-bold text-gray-800 mb-2">Filter</p>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as FilterKey)}
            className="text-blue-500 font-semibold text-base bg-transparent border-none outline-none cursor-pointer mb-1">
            {FILTERS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <p className="text-xs text-gray-400">{fmtDate(start)} – {fmtDate(end)}</p>
        </div>

        {/* Summary table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-base font-bold text-gray-900">Summary</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : locationStats.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No sales data for this period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-sm w-full" style={{ minWidth: 120 + locationStats.length * 110 }}>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-gray-500 font-medium w-28 min-w-28" />
                    {locationStats.map(l => (
                      <th key={l.name} className="px-3 py-3 text-center font-bold text-gray-800 min-w-24">
                        {l.name}
                      </th>
                    ))}
                    {locationStats.length > 1 && (
                      <th className="px-3 py-3 text-center font-bold text-gray-500 min-w-24 bg-gray-100">
                        All
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row, ri) => (
                    <tr key={row.key} className={`border-b border-gray-100 ${ri === 0 ? 'border-t border-gray-200' : ''}`}>
                      <td className="px-4 py-3 text-gray-600 font-medium text-xs">{row.label}</td>
                      {locationStats.map(l => (
                        <td key={l.name} className="px-3 py-3 text-center text-gray-500 font-medium">
                          {fmtMoney(l[row.key])}
                        </td>
                      ))}
                      {locationStats.length > 1 && (
                        <td className="px-3 py-3 text-center text-gray-700 font-bold bg-gray-50">
                          {fmtMoney(grand[row.key])}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Per-location breakdown — daily avg bar chart feel */}
        {locationStats.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-4 py-4">
            <p className="text-sm font-bold text-gray-800 mb-3">Daily Average Ranking</p>
            {locationStats.map((l, i) => {
              const pct = grand.dailyAvg > 0 ? (l.dailyAvg / grand.dailyAvg) * 100 : 0
              return (
                <div key={l.name} className="mb-3 last:mb-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">{l.name}</span>
                    <span className="text-gray-500">{fmtMoney(l.dailyAvg)}/day</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${i === 0 ? 'bg-navy' : i === 1 ? 'bg-blue-400' : 'bg-blue-300'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
