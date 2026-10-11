import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

interface DayData { count: number; total: number }
type CalendarData = Record<string, DayData> // key: "YYYY-MM-DD"

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function isoToday() {
  return new Date().toISOString().split('T')[0]
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

// Monday = 0, Sunday = 6
function firstDayOffset(year: number, month: number) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

function pad(n: number) { return String(n).padStart(2, '0') }

function CalendarMonth({
  year, month, data, today
}: { year: number; month: number; data: CalendarData; today: string }) {
  const days = daysInMonth(year, month)
  const offset = firstDayOffset(year, month)
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1)
  ]

  return (
    <div className="mb-8">
      <h2 className="text-center text-lg font-bold text-gray-800 mb-4">{monthLabel(year, month)}</h2>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const iso = `${year}-${pad(month + 1)}-${pad(day)}`
          const dayData = data[iso]
          const isToday = iso === today
          const isPast = iso < today

          return (
            <div key={i}
              className={`min-h-[72px] rounded-xl p-1.5 flex flex-col ${
                isToday ? 'ring-2 ring-navy bg-navy/5' : ''
              }`}>
              {/* Day number */}
              <div className="flex justify-center mb-1">
                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-navy text-white' : 'text-gray-500'
                }`}>
                  {day}
                </span>
              </div>

              {/* Order pill */}
              {dayData && (
                <div className={`flex-1 rounded-lg px-1 py-1.5 flex flex-col items-center justify-center text-center ${
                  isPast && !isToday
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  <p className="text-xs font-bold leading-tight">
                    {dayData.count} {dayData.count === 1 ? 'order' : 'orders'}
                  </p>
                  <p className="text-xs font-semibold leading-tight mt-0.5">
                    ${dayData.total.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function PickUpPage() {
  const { accountId } = useAuth()
  const { activeLocation } = useLocations(accountId)
  const navigate = useNavigate()
  const [data, setData] = useState<CalendarData>({})
  const [loading, setLoading] = useState(true)
  const today = isoToday()

  // 3 months: last, current, next
  const now = new Date()
  const months = [
    { year: new Date(now.getFullYear(), now.getMonth() - 1).getFullYear(), month: new Date(now.getFullYear(), now.getMonth() - 1).getMonth() },
    { year: now.getFullYear(), month: now.getMonth() },
    { year: new Date(now.getFullYear(), now.getMonth() + 1).getFullYear(), month: new Date(now.getFullYear(), now.getMonth() + 1).getMonth() },
  ]

  useEffect(() => {
    if (!accountId || !activeLocation) return
    setLoading(true)

    const q = query(
      collection(db, 'accounts', accountId, 'orders'),
      where('location', '==', activeLocation.name),
      where('status', '==', 'In progress'),
    )

    getDocs(q).then(snap => {
      const map: CalendarData = {}
      snap.docs.forEach(d => {
        const order = d.data()
        const date = order.pickupDate // "YYYY-MM-DD"
        if (!date) return
        if (!map[date]) map[date] = { count: 0, total: 0 }
        map[date].count++
        map[date].total += order.orderAmount ?? 0
      })
      setData(map)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [accountId, activeLocation])

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/pos')} className="flex items-center gap-1 text-navy text-sm font-medium hover:opacity-70">
          <ChevronLeft size={18} /> Back
        </button>
        <div className="flex-1 text-center">
          <p className="font-bold text-gray-900">Pick-Up Calendar</p>
          {activeLocation && <p className="text-xs text-gray-400">{activeLocation.name} · In progress jobs</p>}
        </div>
        <div className="w-16" />
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {/* Legend */}
            <div className="flex items-center gap-4 justify-center mb-6 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-100" />
                <span>Upcoming</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-100" />
                <span>Overdue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full ring-2 ring-navy bg-navy/5" />
                <span>Today</span>
              </div>
            </div>

            {months.map(({ year, month }) => (
              <CalendarMonth key={`${year}-${month}`} year={year} month={month} data={data} today={today} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
