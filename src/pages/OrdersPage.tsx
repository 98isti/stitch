import { useState, useEffect } from 'react'
import { Search, RefreshCw } from 'lucide-react'
import OrderDetailSheet from '../components/OrderDetailSheet'
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

const FILTERS = ['All', 'Active', 'Ready', 'Collected']

function formatDate(str: string) {
  if (!str) return '—'
  try {
    return new Date(str).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return str }
}

export default function OrdersPage() {
  const { accountId } = useAuth()
  const { activeLocation } = useLocations(accountId)

  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  async function fetchOrders() {
    if (!accountId) return
    setLoading(true)
    try {
      const snap = await getDocs(query(
        collection(db, 'accounts', accountId, 'orders'),
        orderBy('createdAt', 'desc')
      ))
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchOrders() }, [accountId])

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


  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">

      {/* Top controls */}
      <div className="bg-white border-b border-gray-200 px-5 pt-4 pb-3 shrink-0">

        {/* Search + filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text"
              placeholder="Search by phone or order number…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-navy bg-white" />
          </div>
          <button onClick={fetchOrders}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-3">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {f}
            </button>
          ))}
          <span className="ml-auto text-sm text-gray-400 self-center">
            {filtered.length} orders · {activeLocation?.name ?? 'All locations'}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">🧵</p>
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            {/* Header */}
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b border-gray-200">
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Order #</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Date</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Customer</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Amount</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Paid</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Due</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Pickup</th>
              </tr>
            </thead>

            <tbody className="bg-white">
              {filtered.map((order, idx) => {
                const isNewest = idx === 0
                const isDue = order.stillDueAmount > 0 && order.status !== 'Collected'

                return (
                  <tr key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`border-b border-gray-100 cursor-pointer transition-colors ${
                      isNewest ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-gray-50'
                    }`}>

                    {/* Order Number */}
                    <td className="px-5 py-4">
                      <span className="font-bold text-navy text-sm">{order.orderNumberString}</span>
                    </td>

                    {/* Date */}
                    <td className="px-3 py-4 text-gray-600 whitespace-nowrap">
                      {formatDate(order.orderDate)}
                    </td>

                    {/* Customer */}
                    <td className="px-3 py-4">
                      <span className={`font-medium ${order.customerName ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                        {order.customerName || 'Walk-in'}
                      </span>
                      {order.customerPhone && (
                        <p className="text-xs text-gray-400 mt-0.5">{order.customerPhone}</p>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-3 py-4 text-right font-semibold text-gray-900 whitespace-nowrap">
                      ${order.orderAmount.toFixed(2)}
                    </td>

                    {/* Paid */}
                    <td className="px-3 py-4 text-right text-gray-600 whitespace-nowrap">
                      ${order.paidAmount.toFixed(2)}
                    </td>

                    {/* Due */}
                    <td className="px-3 py-4 text-right whitespace-nowrap">
                      <span className={isDue ? 'font-semibold text-red-500' : 'text-gray-400'}>
                        ${order.stillDueAmount.toFixed(2)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        order.status === 'Active'    ? 'bg-blue-50 text-blue-600' :
                        order.status === 'Ready'     ? 'bg-green-100 text-green-700' :
                        order.status === 'Collected' ? 'bg-gray-100 text-gray-500' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {order.status}
                      </span>
                    </td>

                    {/* Pickup Date */}
                    <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                      {formatDate(order.pickupDate)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <OrderDetailSheet
        orderId={selectedOrderId}
        accountId={accountId}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  )
}
