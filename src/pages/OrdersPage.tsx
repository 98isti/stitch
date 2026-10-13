import { useState, useEffect } from 'react'
import { Search, RefreshCw, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import OrderDetailSheet from '../components/OrderDetailSheet'
import EditOrderSheet from '../components/EditOrderSheet'
import { collection, query, orderBy, getDocs, Timestamp } from 'firebase/firestore'

// Simple cash drawer SVG icon
function CashDrawerIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {/* Main body of the POS unit */}
      <rect x="2" y="3" width="20" height="11" rx="2" />
      {/* Drawer slot / separation line */}
      <line x1="2" y1="10" x2="22" y2="10" />
      {/* Drawer pulling out at the bottom */}
      <rect x="4" y="14" width="16" height="7" rx="1.5" />
      {/* Drawer handle */}
      <line x1="9" y1="17.5" x2="15" y2="17.5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
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

const FILTERS = ['All', 'In progress', 'Ready for Pick Up', 'Picked Up', 'Redo']

function formatDate(str: string) {
  if (!str) return '—'
  try {
    return new Date(str).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return str }
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const { accountId } = useAuth()
  const { activeLocation } = useLocations(accountId)

  const [orders, setOrders] = useState<Order[]>([])
  const [drawerLogs, setDrawerLogs] = useState<{ id: string; openedAt: Timestamp; openedBy: string; location: string }[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  async function fetchOrders() {
    if (!accountId) return
    setLoading(true)
    try {
      const [ordersSnap, drawerSnap] = await Promise.all([
        getDocs(query(collection(db, 'accounts', accountId, 'orders'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'accounts', accountId, 'drawerLogs'), orderBy('openedAt', 'desc'))),
      ])
      setOrders(ordersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)))
      setDrawerLogs(drawerSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)))
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

  // Merge orders + drawer logs into one list sorted by date (newest first)
  // Drawer logs only show when filter is 'All' and no search term
  const filteredDrawerLogs = (filter === 'All' && !search)
    ? drawerLogs.filter(d => !activeLocation || d.location === activeLocation.name)
    : []

  type Row = { type: 'order'; data: Order } | { type: 'drawer'; data: typeof drawerLogs[0] }
  const rows: Row[] = [
    ...filtered.map(o => ({ type: 'order' as const, data: o, ts: o.orderDate || '' })),
    ...filteredDrawerLogs.map(d => ({ type: 'drawer' as const, data: d, ts: d.openedAt?.seconds ? new Date(d.openedAt.seconds * 1000).toISOString() : '' })),
  ].sort((a, b) => b.ts.localeCompare(a.ts)) as Row[]


  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/pos')} className="flex items-center gap-1 text-navy text-sm font-medium hover:opacity-70">
          <ChevronLeft size={18} /> Back
        </button>
        <h1 className="flex-1 text-center font-bold text-gray-900">Orders</h1>
        <div className="w-16" />
      </div>

      {/* Search + filters */}
      <div className="bg-white border-b border-gray-200 px-5 pt-3 pb-3 shrink-0">

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
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">🧵</p>
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
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
              {rows.map((row, idx) => {
                if (row.type === 'drawer') {
                  const d = row.data
                  const time = d.openedAt?.seconds
                    ? new Date(d.openedAt.seconds * 1000).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
                    : ''
                  return (
                    <tr key={'drawer-' + d.id} className="border-b border-amber-100 bg-amber-50/40">
                      <td className="px-5 py-3">
                        <CashDrawerIcon size={20} className="text-amber-600" />
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{time}</td>
                      <td className="px-3 py-3 text-amber-700 font-medium text-sm" colSpan={5}>Drawer Opened — by {d.openedBy}</td>
                      <td className="px-5 py-3" />
                    </tr>
                  )
                }
                const order = row.data as Order
                const isNewest = idx === 0
                const isDue = order.stillDueAmount > 0 && order.status !== 'Picked Up'
                return (
                  <tr key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`border-b border-gray-100 cursor-pointer transition-colors ${
                      isNewest ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-gray-50'
                    }`}>
                    <td className="px-5 py-4">
                      <span className="font-bold text-navy text-sm">{order.orderNumberString}</span>
                    </td>
                    <td className="px-3 py-4 text-gray-600 whitespace-nowrap">{formatDate(order.orderDate)}</td>
                    <td className="px-3 py-4">
                      <span className={`font-medium ${order.customerName ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                        {order.customerName || 'Walk-in'}
                      </span>
                      {order.customerPhone && <p className="text-xs text-gray-400 mt-0.5">{order.customerPhone}</p>}
                    </td>
                    <td className="px-3 py-4 text-right font-semibold text-gray-900 whitespace-nowrap">${order.orderAmount.toFixed(2)}</td>
                    <td className="px-3 py-4 text-right text-gray-600 whitespace-nowrap">${order.paidAmount.toFixed(2)}</td>
                    <td className="px-3 py-4 text-right whitespace-nowrap">
                      <span className={isDue ? 'font-semibold text-red-500' : 'text-gray-400'}>${order.stillDueAmount.toFixed(2)}</span>
                    </td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        order.status === 'In progress' ? 'bg-blue-50 text-blue-600' :
                        order.status === 'Ready for Pick Up' ? 'bg-green-100 text-green-700' :
                        order.status === 'Picked Up' ? 'bg-gray-100 text-gray-500' :
                        'bg-gray-100 text-gray-500'
                      }`}>{order.status}</span>
                    </td>
                    <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{formatDate(order.pickupDate)}</td>
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
        onEdit={(id) => { setSelectedOrderId(null); setEditingOrderId(id) }}
      />
      <EditOrderSheet
        orderId={editingOrderId}
        accountId={accountId}
        onClose={() => setEditingOrderId(null)}
        onBack={() => { const id = editingOrderId; setEditingOrderId(null); setSelectedOrderId(id) }}
      />
    </div>
  )
}
