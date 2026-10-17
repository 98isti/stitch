import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { TrendingUp, Users, Clock, ShoppingBag } from 'lucide-react'

interface Stats {
  todayRevenue: number
  todayOrders: number
  readyForPickup: number
  signedInToday: number
}

function fmt(n: number) {
  return '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function DashboardPage() {
  const { accountId } = useAuth()
  const { locations } = useLocations(accountId)
  const [stats, setStats] = useState<Stats>({ todayRevenue: 0, todayOrders: 0, readyForPickup: 0, signedInToday: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accountId) return
    const today = new Date().toISOString().slice(0, 10)

    async function load() {
      const [paymentsSnap, ordersSnap, signInsSnap] = await Promise.all([
        getDocs(query(collection(db, 'accounts', accountId!, 'payments'), where('paidDate', '==', today))),
        getDocs(collection(db, 'accounts', accountId!, 'orders')),
        getDocs(query(collection(db, 'accounts', accountId!, 'signIns'), where('date', '==', today))),
      ])

      const todayRevenue = paymentsSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0)
      const todayOrders = paymentsSnap.docs.length
      const readyForPickup = ordersSnap.docs.filter(d => d.data().status === 'Ready for Pick Up').length
      const signedInToday = signInsSnap.size

      setStats({ todayRevenue, todayOrders, readyForPickup, signedInToday })
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [accountId])

  const cards = [
    { label: "Today's Revenue", value: loading ? '—' : fmt(stats.todayRevenue), icon: TrendingUp, color: 'bg-emerald-50 text-emerald-700' },
    { label: "Orders Today", value: loading ? '—' : String(stats.todayOrders), icon: ShoppingBag, color: 'bg-blue-50 text-blue-700' },
    { label: "Ready for Pick Up", value: loading ? '—' : String(stats.readyForPickup), icon: Clock, color: 'bg-amber-50 text-amber-700' },
    { label: "Signed In Today", value: loading ? '—' : String(stats.signedInToday), icon: Users, color: 'bg-purple-50 text-purple-700' },
  ]

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Stats grid */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-6">
        {cards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className={`inline-flex p-2 rounded-xl mb-3 ${card.color}`}>
              <card.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Locations */}
      {locations.length > 0 && (
        <div className="px-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Locations</h2>
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
            {locations.map(loc => (
              <div key={loc.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{loc.name}</p>
                  <p className="text-xs text-gray-400">{loc.shopType === 'dryCleaning' ? '👔 Dry Cleaning' : '✂️ Alterations'}</p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-mono">{loc.orderPrefix}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
