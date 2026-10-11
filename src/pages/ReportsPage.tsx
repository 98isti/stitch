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

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  })
}

export default function ReportsPage() {
  const { accountId } = useAuth()
  const { activeLocation } = useLocations(accountId)
  const navigate = useNavigate()
  const [rows, setRows] = useState<DaySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCash, setTotalCash] = useState(0)
  const [totalCard, setTotalCard] = useState(0)

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
      setTotalCash(sorted.reduce((s, r) => s + r.cash, 0))
      setTotalCard(sorted.reduce((s, r) => s + r.card, 0))
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
          <div className="max-w-2xl mx-auto px-4 py-4">

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Cash', value: totalCash, colour: 'bg-green-50 text-green-700' },
                { label: 'Card', value: totalCard, colour: 'bg-blue-50 text-blue-700' },
                { label: 'Total', value: totalCash + totalCard, colour: 'bg-navy text-white' },
              ].map(({ label, value, colour }) => (
                <div key={label} className={`rounded-2xl p-4 text-center ${colour}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">{label}</p>
                  <p className="text-lg font-bold">{fmt(value)}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-4 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide col-span-2">Date</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide text-right">Cash</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide text-right">Card</p>
              </div>

              {rows.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-4xl mb-3">📊</p>
                  <p className="text-sm">No paid orders in the last 30 days</p>
                </div>
              ) : rows.map((row, i) => (
                <div key={row.date}
                  className={`grid grid-cols-4 px-4 py-4 items-center ${i < rows.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="col-span-2">
                    <p className="text-sm font-semibold text-gray-900">{formatDate(row.date)}</p>
                    <p className="text-xs font-bold text-navy mt-0.5">{fmt(row.total)}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-700 text-right">{fmt(row.cash)}</p>
                  <p className="text-sm font-semibold text-gray-700 text-right">{fmt(row.card)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
