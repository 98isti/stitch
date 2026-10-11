import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

interface DaySummary {
  date: string       // YYYY-MM-DD
  cash: number
  card: number
  total: number
}

function fmt(n: number) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

export default function ReportsPage() {
  const { accountId } = useAuth()
  const { activeLocation } = useLocations(accountId)
  const navigate = useNavigate()
  const [rows, setRows] = useState<DaySummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accountId || !activeLocation) return
    setLoading(true)

    // Last 30 days
    const since = new Date()
    since.setDate(since.getDate() - 30)
    const sinceIso = since.toISOString().split('T')[0]

    const q = query(
      collection(db, 'accounts', accountId, 'orders'),
      where('location', '==', activeLocation.name),
      where('isPaid', '==', true),
    )

    getDocs(q).then(snap => {
      const map: Record<string, { cash: number; card: number }> = {}

      snap.docs.forEach(d => {
        const o = d.data()
        // Use orderDate (ISO string "YYYY-MM-DD") or fall back to createdAt
        let date: string = ''
        if (typeof o.orderDate === 'string') {
          date = o.orderDate.slice(0, 10)
        } else if (o.orderDate?._seconds) {
          date = new Date(o.orderDate._seconds * 1000).toISOString().split('T')[0]
        } else if (o.createdAt?._seconds) {
          date = new Date(o.createdAt._seconds * 1000).toISOString().split('T')[0]
        }
        if (!date || date < sinceIso) return

        if (!map[date]) map[date] = { cash: 0, card: 0 }
        const amount = o.paidAmount ?? o.orderAmount ?? 0
        const method = (o.paymentMethod ?? '').toLowerCase()
        if (method === 'cash') map[date].cash += amount
        else map[date].card += amount
      })

      const sorted = Object.entries(map)
        .map(([date, { cash, card }]) => ({ date, cash, card, total: cash + card }))
        .sort((a, b) => b.date.localeCompare(a.date))

      setRows(sorted)
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
          <p className="font-bold text-gray-900">Daily Sales</p>
          {activeLocation && <p className="text-xs text-gray-400">{activeLocation.name} · Last 30 days</p>}
        </div>
        <div className="w-16" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="max-w-5xl mx-auto px-4 py-4">

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-6 px-6 py-4 bg-gray-50 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Day</p>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide col-span-2">Date</p>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide text-right">Cash</p>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide text-right">Card</p>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide text-right">Total</p>
              </div>

              {rows.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-4xl mb-3">📊</p>
                  <p className="text-sm">No paid orders in the last 30 days</p>
                </div>
              ) : (() => {
                // Get Monday of a given date's week
                function getMondayIso(iso: string) {
                  const [y, m, d] = iso.split('-').map(Number)
                  const dt = new Date(y, m - 1, d)
                  const day = dt.getDay() // 0=Sun,1=Mon...6=Sat
                  const diff = day === 0 ? -6 : 1 - day // back to Monday
                  dt.setDate(dt.getDate() + diff)
                  return dt.toISOString().split('T')[0]
                }

                const elements: React.ReactNode[] = []
                let weekCash = 0, weekCard = 0
                let currentWeek = rows.length > 0 ? getMondayIso(rows[0].date) : ''

                let monthCash = 0, monthCard = 0
                let currentMonth = rows.length > 0 ? rows[0].date.slice(0, 7) : ''

                rows.forEach((row, i) => {
                  const rowWeek = getMondayIso(row.date)
                  const rowMonth = row.date.slice(0, 7)

                  // New week — insert week subtotal
                  if (rowWeek !== currentWeek) {
                    elements.push(
                      <div key={`week-${currentWeek}`}
                        className="grid grid-cols-6 px-6 py-4 bg-tan/20 border-b border-gray-200 items-center">
                        <p className="text-sm font-bold text-navy col-span-3 uppercase tracking-wide">Week Total</p>
                        <p className="text-sm font-bold text-navy text-right">{fmt(weekCash)}</p>
                        <p className="text-sm font-bold text-navy text-right">{fmt(weekCard)}</p>
                        <p className="text-sm font-bold text-navy text-right">{fmt(weekCash + weekCard)}</p>
                      </div>
                    )
                    weekCash = 0; weekCard = 0
                    currentWeek = rowWeek
                  }

                  // New month — insert month total for previous month
                  if (rowMonth !== currentMonth) {
                    const [my, mm] = currentMonth.split('-').map(Number)
                    const monthName = new Date(my, mm - 1, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
                    elements.push(
                      <div key={`month-${currentMonth}`}
                        className="grid grid-cols-6 px-6 py-4 bg-navy items-center">
                        <p className="text-sm font-bold text-white col-span-3">{monthName} Total</p>
                        <p className="text-sm font-bold text-white text-right">{fmt(monthCash)}</p>
                        <p className="text-sm font-bold text-white text-right">{fmt(monthCard)}</p>
                        <p className="text-sm font-bold text-white text-right">{fmt(monthCash + monthCard)}</p>
                      </div>
                    )
                    monthCash = 0; monthCard = 0
                    currentMonth = rowMonth
                  }

                  weekCash += row.cash; weekCard += row.card
                  monthCash += row.cash; monthCard += row.card

                  const [y, m, d] = row.date.split('-').map(Number)
                  const dt = new Date(y, m - 1, d)
                  const dayName = dt.toLocaleDateString('en-AU', { weekday: 'long' })
                  const dateStr = dt.toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' })

                  elements.push(
                    <div key={row.date}
                      className={`grid grid-cols-6 px-6 py-5 items-center ${i < rows.length - 1 ? 'border-b border-gray-100' : ''}`}>
                      <p className="text-base font-semibold text-gray-900">{dayName}</p>
                      <p className="text-base text-gray-600 col-span-2">{dateStr}</p>
                      <p className="text-base text-gray-700 text-right">{fmt(row.cash)}</p>
                      <p className="text-base text-gray-700 text-right">{fmt(row.card)}</p>
                      <p className="text-base font-bold text-gray-900 text-right">{fmt(row.total)}</p>
                    </div>
                  )
                })

                // Last week subtotal
                elements.push(
                  <div key={`week-${currentWeek}-last`}
                    className="grid grid-cols-6 px-6 py-4 bg-tan/20 border-b border-gray-200 items-center">
                    <p className="text-sm font-bold text-navy col-span-3 uppercase tracking-wide">Week Total</p>
                    <p className="text-sm font-bold text-navy text-right">{fmt(weekCash)}</p>
                    <p className="text-sm font-bold text-navy text-right">{fmt(weekCard)}</p>
                    <p className="text-sm font-bold text-navy text-right">{fmt(weekCash + weekCard)}</p>
                  </div>
                )

                // Last month total
                const [lmy, lmm] = currentMonth.split('-').map(Number)
                const lastMonthName = new Date(lmy, lmm - 1, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
                elements.push(
                  <div key={`month-${currentMonth}-last`}
                    className="grid grid-cols-6 px-6 py-4 bg-navy items-center">
                    <p className="text-sm font-bold text-white col-span-3">{lastMonthName} Total</p>
                    <p className="text-sm font-bold text-white text-right">{fmt(monthCash)}</p>
                    <p className="text-sm font-bold text-white text-right">{fmt(monthCard)}</p>
                    <p className="text-sm font-bold text-white text-right">{fmt(monthCash + monthCard)}</p>
                  </div>
                )

                return elements
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
