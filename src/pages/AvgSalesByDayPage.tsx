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
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// JS getDay() → Mon-first index (Mon=0 … Sun=6)
function dayIndex(dateStr: string): number {
  return (new Date(dateStr + 'T00:00:00').getDay() + 6) % 7
}

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function getWeekRange(): { start: string; end: string; label: string } {
  const now  = new Date()
  const dow  = now.getDay()
  const mon  = new Date(now)
  mon.setDate(now.getDate() - ((dow + 6) % 7))
  mon.setHours(0,0,0,0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return {
    start: toYMD(mon),
    end:   toYMD(sun),
    label: `${mon.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})} – ${sun.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})}`,
  }
}

function getLastMonthRange(): { start: string; end: string; label: string } {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const end   = new Date(now.getFullYear(), now.getMonth(), 0)
  return {
    start: toYMD(start),
    end:   toYMD(end),
    label: `${start.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})} – ${end.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})}`,
  }
}

function fmt(amount: number, count: number) {
  if (count === 0) return ''
  return `$${Math.round(amount).toLocaleString()} (${count})`
}

// Build day-of-week stats: { [location][dayIndex] = { total, count, days } }
function buildDayStats(payments: Payment[], start: string, end: string, avg: boolean) {
  // stats[location][dayIdx] = { total, count, dayCount }
  const stats: Record<string, { total: number; count: number; dayCount: Set<string> }[]> = {}

  payments
    .filter(p => p.paidDate >= start && p.paidDate <= end && p.location)
    .forEach(p => {
      const loc = p.location
      const di  = dayIndex(p.paidDate)
      if (!stats[loc]) stats[loc] = Array.from({length:7}, () => ({ total:0, count:0, dayCount: new Set() }))
      stats[loc][di].total += p.amount || 0
      stats[loc][di].count++
      stats[loc][di].dayCount.add(p.paidDate)
    })

  // If averaging, divide total by number of unique days that day appeared in the range
  if (avg) {
    Object.values(stats).forEach(locStats => {
      locStats.forEach(s => {
        const nDays = s.dayCount.size || 1
        s.total = s.total / nDays
        s.count = Math.round(s.count / nDays)
      })
    })
  }

  return stats
}

interface TableProps {
  title: string
  dateLabel: string
  stats: Record<string, { total: number; count: number }[]>
  locationNames: string[]
}

function SalesTable({ title, dateLabel, stats, locationNames }: TableProps) {
  const visibleLocs = locationNames.filter(n => stats[n])
  if (visibleLocs.length === 0) return null

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="bg-gray-100 rounded-t-2xl px-4 py-3">
        <p className="text-base font-bold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{dateLabel}</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-b-2xl shadow-sm border border-gray-200 border-t-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-sm" style={{ minWidth: 100 + DAYS.length * 110 }}>
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-3 text-sm font-bold text-gray-900 w-28 min-w-28 bg-white sticky left-0 z-10">
                  Location
                </th>
                {DAYS.map(d => (
                  <th key={d} className="px-3 py-3 text-center text-sm font-bold text-gray-900 min-w-28">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleLocs.map((loc, i) => (
                <tr key={loc} className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800 bg-white sticky left-0 z-10 border-r border-gray-100">
                    {loc}
                  </td>
                  {stats[loc].map((s, di) => (
                    <td key={di} className={`px-2 py-3 text-center text-xs text-gray-500 ${di >= 5 ? 'bg-blue-50/30' : ''}`}>
                      {fmt(s.total, s.count)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function AvgSalesByDayPage() {
  const { accountId } = useAuth()
  const { locations }  = useLocations(accountId)
  const navigate       = useNavigate()

  const [payments, setPayments] = useState<Payment[]>([])
  const [loading,  setLoading]  = useState(true)

  async function load() {
    if (!accountId) return
    setLoading(true)
    const snap = await getDocs(collection(db, 'accounts', accountId, 'payments')).catch(() => null)
    if (snap) setPayments(snap.docs.map(d => ({ ...d.data() } as Payment)))
    setLoading(false)
  }

  useEffect(() => { load() }, [accountId])

  const week      = useMemo(() => getWeekRange(), [])
  const lastMonth = useMemo(() => getLastMonthRange(), [])

  const locationNames = useMemo(() =>
    [...locations.map(l => l.name)].sort(),
    [locations]
  )

  const thisWeekStats  = useMemo(() => buildDayStats(payments, week.start, week.end, false), [payments, week])
  const lastMonthStats = useMemo(() => buildDayStats(payments, lastMonth.start, lastMonth.end, true), [payments, lastMonth])

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 bg-white border-b border-gray-100 flex-shrink-0">
        <button onClick={() => navigate('/mgmt-more')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 border border-gray-200">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-base font-bold text-gray-900">Avg Sales by Day</h1>
        <button onClick={load}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 border border-gray-200">
          <RefreshCw size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <SalesTable
              title="This Week"
              dateLabel={week.label}
              stats={thisWeekStats}
              locationNames={locationNames}
            />
            <SalesTable
              title="Average of Last Month"
              dateLabel={lastMonth.label}
              stats={lastMonthStats}
              locationNames={locationNames}
            />
          </>
        )}
      </div>
    </div>
  )
}
