import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toLocalDate } from '../lib/dateUtils'

interface PaymentRow {
  paidDate: string
  amount: number
  method: string
  location: string
}

interface DaySummary {
  date: string
  cash: number
  card: number
  total: number
}

function fmt(n: number) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

export default function ManagementDailySalesPage() {
  const { accountId } = useAuth()
  const { locations } = useLocations(accountId)
  const navigate = useNavigate()
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState('All Locations')

  useEffect(() => {
    if (!accountId) return
    setLoading(true)

    const since = new Date()
    since.setDate(since.getDate() - 30)
    const sinceIso = toLocalDate(since.getTime())

    getDocs(query(
      collection(db, 'accounts', accountId, 'payments'),
      where('paidDate', '>=', sinceIso),
    )).then(snap => {
      setPayments(snap.docs.map(d => d.data() as PaymentRow))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [accountId])

  const rows = useMemo<DaySummary[]>(() => {
    const filtered = selectedLocation === 'All Locations'
      ? payments
      : payments.filter(p => p.location === selectedLocation)

    const map: Record<string, { cash: number; card: number }> = {}
    filtered.forEach(p => {
      const date = p.paidDate ?? ''
      if (!date) return
      if (!map[date]) map[date] = { cash: 0, card: 0 }
      const method = (p.method ?? '').toLowerCase()
      if (method === 'cash') map[date].cash += p.amount ?? 0
      else map[date].card += p.amount ?? 0
    })

    return Object.entries(map)
      .map(([date, { cash, card }]) => ({ date, cash, card, total: cash + card }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [payments, selectedLocation])

  const grandTotal = rows.reduce((s, r) => s + r.total, 0)
  const grandCash  = rows.reduce((s, r) => s + r.cash, 0)
  const grandCard  = rows.reduce((s, r) => s + r.card, 0)

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/mgmt-more')}
            className="flex items-center gap-1 text-navy text-sm font-medium hover:opacity-70">
            <ArrowLeft size={16} /> More
          </button>
          <p className="font-bold text-gray-900 flex-1 text-center">Daily Sales</p>
          <div className="w-14" />
        </div>
        {/* Location filter */}
        <select
          value={selectedLocation}
          onChange={e => setSelectedLocation(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy bg-white"
        >
          <option>All Locations</option>
          {locations.map(l => <option key={l.id}>{l.name}</option>)}
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>{rows.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-sm">No sales in the last 30 days</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map(row => {
                const d = new Date(row.date + 'T00:00:00')
                const dayDate = d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
                return (
                  <div key={row.date} className="bg-white rounded-xl px-4 py-3 border border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{dayDate}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Cash {fmt(row.cash)} · Card {fmt(row.card)}
                      </p>
                    </div>
                    <p className="text-base font-bold text-gray-900">{fmt(row.total)}</p>
                  </div>
                )
              })}

              {/* Grand total */}
              <div className="bg-navy/5 rounded-xl px-4 py-3 border border-navy/10 flex items-center justify-between mt-2">
                <div>
                  <p className="text-sm font-bold text-navy">30-Day Total</p>
                  <p className="text-xs text-gray-500 mt-0.5">Cash {fmt(grandCash)} · Card {fmt(grandCard)}</p>
                </div>
                <p className="text-lg font-bold text-navy">{fmt(grandTotal)}</p>
              </div>
            </div>
          )}</>
        )}
      </div>
    </div>
  )
}
