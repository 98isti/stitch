import { useState, useEffect } from 'react'
import { Search, ChevronRight, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'

export interface Order {
  id: string
  orderNumberString: string
  orderNumber: number
  customerName: string
  customerPhone: string
  orderDate: string
  pickupDate: string
  orderAmount: number
  paidAmount: number
  stillDueAmount: number
  isPaid: boolean
  status: string
  location: string
  paymentMethod: string
  items: string
}

const STATUS_COLORS: Record<string, string> = {
  'Active':    'bg-blue-50 text-blue-600',
  'Ready':     'bg-green-100 text-green-700',
  'Collected': 'bg-gray-100 text-gray-500',
}

const FILTERS = ['All', 'Active', 'Ready', 'Collected']

export default function OrdersPage() {
  const navigate = useNavigate()
  const { accountId } = useAuth()
  const { activeLocation } = useLocations(accountId)

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  async function fetchOrders() {
    if (!accountId) return
    setLoading(true)
    try {
      const q = query(
        collection(db, 'accounts', accountId, 'orders'),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))
      setOrders(all)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrders() }, [accountId])

  // Filter by active location + search + status
  const filtered = orders.filter(o => {
    const matchLocation = !activeLocation || o.location === activeLocation.name
    const matchFilter = filter === 'All' || o.status === filter
    const term = search.toLowerCase()
    const matchSearch = !search ||
      o.customerName?.toLowerCase().includes(term) ||
      o.orderNumberString?.toLowerCase().includes(term) ||
      o.customerPhone?.includes(search)
    return matchLocation && matchFilter && matchSearch
  })

  const today = new Date().toISOString().split('T')[0]
  const todayOrders = filtered.filter(o => o.orderDate === today)
  const todayRevenue = todayOrders.reduce((s, o) => s + o.orderAmount, 0)
  const readyCount = filtered.filter(o => o.status === 'Ready').length
  const unpaidCount = filtered.filter(o => !o.isPaid && o.status !== 'Collected').length

  function parseItems(itemsJson: string): string {
    try {
      const arr = JSON.parse(itemsJson)
      return arr.map((i: { name: string; quantity: number }) => `${i.name}${i.quantity > 1 ? ' ×' + i.quantity : ''}`).join(', ')
    } catch {
      return ''
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Sticky top controls */}
      <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-500">{activeLocation?.name ?? 'All locations'} · {filtered.length} orders</p>
          </div>
          <button onClick={fetchOrders} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-0.5">Today</p>
            <p className="text-base font-bold text-navy">${todayRevenue.toFixed(0)}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-0.5">Ready</p>
            <p className="text-base font-bold text-green-600">{readyCount}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-0.5">Unpaid</p>
            <p className="text-base font-bold text-amber-600">{unpaidCount}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search name, order #, phone…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-navy" />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === f ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🧵</p>
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          filtered.map(order => (
            <button key={order.id}
              onClick={() => navigate(`/orders/${order.id}`)}
              className="w-full bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4 hover:border-navy/20 hover:shadow-sm transition-all text-left">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-gray-900 text-sm truncate">{order.customerName || 'Walk-in'}</span>
                  {!order.isPaid && order.status !== 'Collected' && (
                    <span className="text-xs bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-medium shrink-0">Unpaid</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate mb-1.5">{parseItems(order.items)}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400">{order.orderNumberString}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {order.status}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-gray-900">${order.orderAmount.toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Due {order.pickupDate}</p>
              </div>
              <ChevronRight size={15} className="text-gray-300 shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  )
}
