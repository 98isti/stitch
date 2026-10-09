import { useState } from 'react'
import { Search, Plus, Filter, ChevronRight } from 'lucide-react'

const MOCK_ORDERS = [
  { id: 'CAR-1042', customer: 'Sarah Johnson', phone: '0412 345 678', items: 'Dress hem × 2, Zip replacement', total: 85, paid: true, status: 'Ready', date: '2026-10-09' },
  { id: 'CAR-1041', customer: 'David Chen', phone: '0423 456 789', items: 'Suit trousers × 1', total: 45, paid: false, status: 'In Progress', date: '2026-10-09' },
  { id: 'CAR-1040', customer: 'Maria Silva', phone: '0434 567 890', items: 'Dress taken in, Lining repair', total: 120, paid: true, status: 'Ready', date: '2026-10-08' },
  { id: 'CAR-1039', customer: 'James Wilson', phone: '0445 678 901', items: 'Jacket sleeves × 1', total: 55, paid: true, status: 'Collected', date: '2026-10-08' },
  { id: 'CAR-1038', customer: 'Aisha Rahman', phone: '0456 789 012', items: 'Wedding dress alterations', total: 380, paid: false, status: 'In Progress', date: '2026-10-07' },
  { id: 'CAR-1037', customer: 'Tom Baker', phone: '0467 890 123', items: 'Pants waist in × 2', total: 70, paid: true, status: 'Collected', date: '2026-10-07' },
]

const STATUS_COLORS: Record<string, string> = {
  'Ready':       'bg-green-100 text-green-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  'Collected':   'bg-gray-100 text-gray-500',
}

const FILTERS = ['All', 'Ready', 'In Progress', 'Collected']

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  const filtered = MOCK_ORDERS.filter(o => {
    const matchFilter = filter === 'All' || o.status === filter
    const matchSearch = !search ||
      o.customer.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.phone.includes(search)
    return matchFilter && matchSearch
  })

  const todayTotal = MOCK_ORDERS
    .filter(o => o.date === '2026-10-09')
    .reduce((sum, o) => sum + o.total, 0)

  const unpaidCount = MOCK_ORDERS.filter(o => !o.paid && o.status !== 'Collected').length

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500">Carlingford · Today</p>
        </div>
        <button className="flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-light transition-colors">
          <Plus size={16} />
          New Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Today's revenue</p>
          <p className="text-xl font-bold text-navy">${todayTotal}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Ready to collect</p>
          <p className="text-xl font-bold text-green-600">{MOCK_ORDERS.filter(o => o.status === 'Ready').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Unpaid</p>
          <p className="text-xl font-bold text-amber-600">{unpaidCount}</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, order #, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
          />
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
          <Filter size={15} />
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-navy text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-navy/30'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div className="space-y-2">
        {filtered.map(order => (
          <div
            key={order.id}
            className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4 hover:border-navy/20 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-gray-900 text-sm">{order.customer}</span>
                {!order.paid && order.status !== 'Collected' && (
                  <span className="text-xs bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-medium">Unpaid</span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">{order.items}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs font-mono text-gray-400">{order.id}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status]}`}>
                  {order.status}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-gray-900">${order.total}</p>
              <p className="text-xs text-gray-400 mt-0.5">{order.date}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 shrink-0" />
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <ShoppingBagEmpty />
            <p className="mt-2 text-sm">No orders found</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ShoppingBagEmpty() {
  return (
    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
      <span className="text-2xl">🛍️</span>
    </div>
  )
}
