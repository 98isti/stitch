import { useState, useEffect, useRef } from 'react'
import { Search, RefreshCw, ChevronLeft, X } from 'lucide-react'
import { useIsManagement } from '../context/ManagementContext'
import { useNavigate } from 'react-router-dom'
import OrderDetailSheet from '../components/OrderDetailSheet'
import EditOrderSheet from '../components/EditOrderSheet'
import {
  collection, query, where, orderBy, limit, startAfter,
  getDocs, QueryDocumentSnapshot, QueryConstraint, Timestamp
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { toLocalDate } from '../lib/dateUtils'

function CashDrawerIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <rect x="2" y="3" width="20" height="11" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <rect x="4" y="14" width="16" height="7" rx="1.5" />
      <line x1="9" y1="17.5" x2="15" y2="17.5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

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
  locationId?: string
  paymentMethod: string
  items: string
  createdAt?: Timestamp
}

interface DrawerLog {
  id: string
  openedAt: Timestamp
  openedBy: string
  location: string
}

const FILTERS = ['All', 'In progress', 'Ready for Pick Up', 'Picked Up', 'Redo']

function formatDate(str: string) {
  if (!str) return '—'
  try { return new Date(str + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return str }
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const { accountId } = useAuth()
  const { activeLocation } = useLocations(accountId)

  const [orders, setOrders] = useState<Order[]>([])
  const [drawerLogs, setDrawerLogs] = useState<DrawerLog[]>([])
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)

  // Search state
  const [searchResults, setSearchResults] = useState<Order[] | null>(null)
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const PAGE_SIZE = 100

  // ── Load orders — newest first, cursor-based pagination ────────────────────────
  async function loadOrders(reset = false) {
    if (!accountId || !activeLocation) return
    if (reset) { setLoading(true); setLastDoc(null) }
    else setLoadingMore(true)

    try {
      const constraints: QueryConstraint[] = [
        where('locationId', '==', activeLocation.id),
      ]
      if (filter !== 'All') constraints.push(where('status', '==', filter))
      constraints.push(orderBy('createdAt', 'desc'))
      constraints.push(limit(PAGE_SIZE))
      if (!reset && lastDoc) constraints.push(startAfter(lastDoc))

      const snap = await getDocs(query(
        collection(db, 'accounts', accountId, 'orders'),
        ...constraints
      ))

      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))
      setOrders(prev => reset ? loaded : [...prev, ...loaded])
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null)
      setHasMore(snap.docs.length === PAGE_SIZE)
    } catch (e) { console.error('loadOrders:', e) }
    finally {
      if (reset) setLoading(false)
      else setLoadingMore(false)
    }
  }

  // ── Load drawer logs for active location ─────────────────────────────────
  async function loadDrawerLogs() {
    if (!accountId || !activeLocation) return
    try {
      const snap = await getDocs(query(
        collection(db, 'accounts', accountId, 'drawerLogs'),
        where('locationId', '==', activeLocation.id),
        orderBy('openedAt', 'desc'),
        limit(50)
      ))
      setDrawerLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as DrawerLog)))
    } catch (e) { console.error('loadDrawerLogs:', e) }
  }

  // ── Server-side search ────────────────────────────────────────────────────
  async function runSearch(term: string) {
    if (!accountId || !activeLocation || !term.trim()) {
      setSearchResults(null)
      return
    }
    setSearching(true)
    try {
      const t = term.trim()
      const tUp = t.toUpperCase()
      const seen = new Set<string>()
      const results: Order[] = []

      const add = (docs: QueryDocumentSnapshot[]) => {
        docs.forEach(d => {
          if (!seen.has(d.id)) {
            seen.add(d.id)
            results.push({ id: d.id, ...d.data() } as Order)
          }
        })
      }

      const locFilter = where('locationId', '==', activeLocation.id)

      // Phone prefix search
      const phoneSnap = await getDocs(query(
        collection(db, 'accounts', accountId, 'orders'),
        locFilter,
        where('customerPhone', '>=', t),
        where('customerPhone', '<=', t + '\uf8ff'),
        limit(50)
      )).catch(() => null)
      if (phoneSnap) add(phoneSnap.docs)

      // Order number string prefix search (case-insensitive via uppercase)
      const orderSnap = await getDocs(query(
        collection(db, 'accounts', accountId, 'orders'),
        locFilter,
        where('orderNumberString', '>=', tUp),
        where('orderNumberString', '<=', tUp + '\uf8ff'),
        limit(50)
      )).catch(() => null)
      if (orderSnap) add(orderSnap.docs)

      // If pure digits — also exact orderNumber match
      if (/^\d+$/.test(t)) {
        const numSnap = await getDocs(query(
          collection(db, 'accounts', accountId, 'orders'),
          locFilter,
          where('orderNumber', '==', parseInt(t)),
          limit(10)
        )).catch(() => null)
        if (numSnap) add(numSnap.docs)
      }

      // Sort newest first
      results.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      setSearchResults(results)
    } catch (e) { console.error('search:', e) }
    finally { setSearching(false) }
  }

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!search.trim()) { setSearchResults(null); return }
    searchTimer.current = setTimeout(() => runSearch(search), 350)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search, activeLocation?.id])

  // Reload when location or filter changes
  useEffect(() => {
    setSearch('')
    setSearchResults(null)
    setOrders([])
    loadOrders(true)
    loadDrawerLogs()
  }, [accountId, activeLocation?.id, filter])

  // Infinite scroll — load more when sentinel enters viewport
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          loadOrders(false)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, lastDoc])

  // ── Rows to display ───────────────────────────────────────────────────────
  const isSearching = search.trim().length > 0

  type Row = { type: 'order'; data: Order; ts: number } | { type: 'drawer'; data: DrawerLog; ts: number }

  // Build set of dates that have real orders loaded — drawer logs only show on those dates
  const loadedOrderDates = new Set(
    orders.map(o => toLocalDate((o.createdAt?.seconds ?? 0) * 1000))
  )

  const rows: Row[] = isSearching
    ? (searchResults ?? []).map(o => ({ type: 'order' as const, data: o, ts: o.createdAt?.seconds ?? 0 }))
    : [
        ...orders.map(o => ({ type: 'order' as const, data: o, ts: o.createdAt?.seconds ?? 0 })),
        ...(filter === 'All'
          ? drawerLogs
              .filter(d => loadedOrderDates.has(toLocalDate((d.openedAt?.seconds ?? 0) * 1000)))
              .map(d => ({ type: 'drawer' as const, data: d, ts: d.openedAt?.seconds ?? 0 }))
          : []
        ),
      ].sort((a, b) => b.ts - a.ts)

  const displayCount = isSearching ? (searchResults?.length ?? 0) : orders.length

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        {!useIsManagement() && (
          <button onClick={() => navigate('/pos')} className="flex items-center gap-1 text-navy text-sm font-medium hover:opacity-70">
            <ChevronLeft size={18} /> Back
          </button>
        )}
        <h1 className="flex-1 text-center font-bold text-gray-900">Orders</h1>
        <div className="w-16" />
      </div>

      {/* Search + filters */}
      <div className="bg-white border-b border-gray-200 px-5 pt-3 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by phone or order number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-navy bg-white"
            />
            {search && (
              <button onClick={() => { setSearch(''); setSearchResults(null) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => { setSearch(''); setSearchResults(null); loadOrders(true); loadDrawerLogs() }}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex gap-2 mt-3 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {f}
            </button>
          ))}
          <span className="ml-auto text-sm text-gray-400 self-center whitespace-nowrap">
            {isSearching
              ? (searching ? 'Searching…' : `${displayCount} found`)
              : `${displayCount} orders · ${activeLocation?.name ?? '—'}`
            }
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading || (isSearching && searching) ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">🧵</p>
            <p className="text-sm">{isSearching ? 'No orders matched your search' : 'No orders found'}</p>
          </div>
        ) : (
          <>
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
                        <td className="px-5 py-3"><CashDrawerIcon size={20} className="text-amber-600" /></td>
                        <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{time}</td>
                        <td className="px-3 py-3 text-amber-700 font-medium text-sm" colSpan={5}>Drawer Opened — by {d.openedBy}</td>
                        <td className="px-5 py-3" />
                      </tr>
                    )
                  }

                  const order = row.data as Order
                  const isNewest = idx === 0 && !isSearching
                  const isDue = order.stillDueAmount > 0 && order.status !== 'Picked Up'

                  return (
                    <tr key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${
                        order.status === 'Cancelled' ? 'opacity-50 bg-gray-50 hover:bg-gray-100' :
                        isNewest ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      style={order.status === 'Cancelled' ? {
                        backgroundImage: 'linear-gradient(to right, #9ca3af, #9ca3af)',
                        backgroundSize: '100% 1px',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                      } : undefined}>
                      <td className="px-5 py-4">
                        <span className={`font-bold text-sm ${order.status === 'Cancelled' ? 'text-gray-400 line-through' : 'text-navy'}`}>
                          {order.orderNumberString}
                        </span>
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
                          order.status === 'In progress'      ? 'bg-blue-50 text-blue-600' :
                          order.status === 'Ready for Pick Up' ? 'bg-green-100 text-green-700' :
                          order.status === 'Picked Up'        ? 'bg-gray-100 text-gray-500' :
                          order.status === 'Cancelled'        ? 'bg-red-100 text-red-500' :
                          order.status === 'Redo'             ? 'bg-orange-100 text-orange-500' :
                          'bg-gray-100 text-gray-500'
                        }`}>{order.status}</span>
                      </td>
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{formatDate(order.pickupDate)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Infinite scroll sentinel */}
            {!isSearching && (
              <div ref={sentinelRef} className="flex justify-center py-4">
                {loadingMore && (
                  <div className="w-5 h-5 border-2 border-navy border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            )}
          </>
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
