import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { ChevronRight, Phone } from 'lucide-react'

interface Order {
  id: string
  orderNumberString: string
  customerName: string
  customerPhone: string
  pickupDate: string
  orderAmount: number
  isPaid: boolean
  status: string
  location: string
}

export default function TodaysDuePage() {
  const navigate = useNavigate()
  const { accountId } = useAuth()
  const { activeLocation } = useLocations(accountId)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!accountId) return
    setLoading(true)
    getDocs(query(collection(db, 'accounts', accountId, 'orders'), orderBy('pickupDate')))
      .then(snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))
        const due = all.filter(o =>
          o.pickupDate <= today &&
          o.status !== 'Collected' &&
          (!activeLocation || o.location === activeLocation.name)
        )
        setOrders(due)
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [accountId, activeLocation, today])

  const overdue = orders.filter(o => o.pickupDate < today)
  const dueToday = orders.filter(o => o.pickupDate === today)

  function OrderRow({ order }: { order: Order }) {
    return (
      <button onClick={() => navigate(`/orders/${order.id}`)}
        className="w-full bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3 hover:border-navy/20 hover:shadow-sm transition-all text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-gray-900 text-sm">{order.customerName || 'Walk-in'}</span>
            {!order.isPaid && (
              <span className="text-xs bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-medium">Unpaid</span>
            )}
            {order.status === 'Ready' && (
              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Ready</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400">{order.orderNumberString}</span>
            {order.customerPhone && (
              <a href={`tel:${order.customerPhone}`} onClick={e => e.stopPropagation()}
                className="flex items-center gap-0.5 text-xs text-blue-500 hover:text-blue-700">
                <Phone size={10} /> {order.customerPhone}
              </a>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-gray-900">${order.orderAmount.toFixed(2)}</p>
          <p className={`text-xs mt-0.5 ${order.pickupDate < today ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
            {order.pickupDate < today ? `Overdue: ${order.pickupDate}` : 'Today'}
          </p>
        </div>
        <ChevronRight size={15} className="text-gray-300 shrink-0" />
      </button>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 shrink-0">
        <p className="text-xs text-gray-500">{activeLocation?.name ?? 'All locations'} · {today}</p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-red-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-0.5">Overdue</p>
            <p className="text-lg font-bold text-red-500">{overdue.length}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-0.5">Due Today</p>
            <p className="text-lg font-bold text-amber-600">{dueToday.length}</p>
          </div>
          <div className="bg-gray-100 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-0.5">Total</p>
            <p className="text-lg font-bold text-gray-700">{orders.length}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-semibold text-gray-600">All clear!</p>
            <p className="text-sm mt-1">No orders due today or overdue</p>
          </div>
        ) : (
          <>
            {overdue.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-red-500 uppercase tracking-wide mb-2 px-1">Overdue</h3>
                <div className="space-y-2">{overdue.map(o => <OrderRow key={o.id} order={o} />)}</div>
              </div>
            )}
            {dueToday.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2 px-1">Due Today</h3>
                <div className="space-y-2">{dueToday.map(o => <OrderRow key={o.id} order={o} />)}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
