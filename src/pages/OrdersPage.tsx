import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, RefreshCw, ChevronLeft } from 'lucide-react'
import { useIsManagement } from '../context/ManagementContext'
import { useNavigate } from 'react-router-dom'
import OrderDetailSheet from '../components/OrderDetailSheet'
import EditOrderSheet from '../components/EditOrderSheet'
import {
  collection, query, orderBy, where, limit, getDocs,
  startAfter, Timestamp, type QueryDocumentSnapshot, type DocumentData,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { useVirtualizer } from '@tanstack/react-virtual'

const INITIAL_LOAD = 600
const PAGE_SIZE = 300
const FILTERS = ['All', 'In progress', 'Ready for Pick Up', 'Picked Up', 'Redo']

// Column grid definition — inline style so it's in the JS bundle (no Tailwind CSS caching issues)
const COL_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '130px 130px 1fr 80px 72px 90px 160px 100px',
  columnGap: '20px',
}

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

type DrawerLog = {
  id: string
  openedAt: Timestamp
  openedBy: string
  location: string
  locationId?: string
}

type Row =
  | { type: 'order';  data: Order;     ts: string }
  | { type: 'drawer'; data: DrawerLog; ts: string }

function formatDate(str: string) {
  if (!str) return '—'
  try {
    return new Date(str).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return str }
}

function tsToIso(ts: Timestamp | undefined): string {
  if (!ts?.seconds) return ''
  return new Date(ts.seconds * 1000).toISOString()
}

// ─────────────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const navigate   = useNavigate()
  const { accountId } = useAuth()
  const { activeLocation } = useLocations(accountId)
  const isManagement = useIsManagement()

  // ── Core data ──────────────────────────────────────────────────────────────
  const [orders,     setOrders]     = useState<Order[]>([])
  const [drawerLogs, setDrawerLogs] = useState<DrawerLog[]>([])

  // Pagination
  const [lastDoc,        setLastDoc]        = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [oldestLoadedAt, setOldestLoadedAt] = useState<Date | null>(null)
  const [hasMore,        setHasMore]        = useState(true)

  // Loading states
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // ── Search ─────────────────────────────────────────────────────────────────
  const [search,        setSearch]        = useState('')
  const [filter,        setFilter]        = useState('All')
  const [serverResults, setServerResults] = useState<Order[] | null>(null)
  const [searching,     setSearching]     = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Sheets ─────────────────────────────────────────────────────────────────
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [editingOrderId,  setEditingOrderId]  = useState<string | null>(null)

  // ── Refs ───────────────────────────────────────────────────────────────────
  const parentRef   = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // ── Helpers ────────────────────────────────────────────────────────────────

  async function fetchDrawerLogsForWindow(
    from: Date, to: Date, locId: string, acctId: string
  ): Promise<DrawerLog[]> {
    try {
      const snap = await getDocs(query(
        collection(db, 'accounts', acctId, 'drawerLogs'),
        where('locationId', '==', locId),
        where('openedAt', '>=', Timestamp.fromDate(from)),
        where('openedAt', '<=', Timestamp.fromDate(to)),
        orderBy('openedAt', 'desc'),
      ))
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as DrawerLog))
    } catch (e) {
      console.error('Drawer log fetch error:', e)
      return []
    }
  }

  // ── Initial load ───────────────────────────────────────────────────────────

  async function fetchOrders() {
    if (!accountId || !activeLocation) return
    setLoading(true)
    setOrders([])
    setDrawerLogs([])
    setLastDoc(null)
    setOldestLoadedAt(null)
    setHasMore(true)
    try {
      const snap = await getDocs(query(
        collection(db, 'accounts', accountId, 'orders'),
        where('locationId', '==', activeLocation.id),
        orderBy('createdAt', 'desc'),
        limit(INITIAL_LOAD),
      ))

      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))
      setOrders(fetched)
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null)
      setHasMore(snap.docs.length === INITIAL_LOAD)

      if (fetched.length > 0) {
        const newest = new Date() // use now so drawer logs after the last order are included
        const oldest = fetched[fetched.length - 1].createdAt
          ? new Date(fetched[fetched.length - 1].createdAt!.seconds * 1000)
          : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

        setOldestLoadedAt(oldest)
        const logs = await fetchDrawerLogsForWindow(oldest, newest, activeLocation.id, accountId)
        setDrawerLogs(logs)
      }
    } catch (e) {
      console.error('fetchOrders error:', e)
    } finally {
      setLoading(false)
    }
  }

  // ── Load more (infinite scroll) ────────────────────────────────────────────

  const fetchMore = useCallback(async () => {
    if (!accountId || !activeLocation || !lastDoc || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const snap = await getDocs(query(
        collection(db, 'accounts', accountId, 'orders'),
        where('locationId', '==', activeLocation.id),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(PAGE_SIZE),
      ))

      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))
      setOrders(prev => [...prev, ...fetched])
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null)
      setHasMore(snap.docs.length === PAGE_SIZE)

      // Fetch drawer logs for the newly uncovered time window
      if (fetched.length > 0 && oldestLoadedAt) {
        const newOldest = fetched[fetched.length - 1].createdAt
          ? new Date(fetched[fetched.length - 1].createdAt!.seconds * 1000)
          : null
        if (newOldest) {
          const newLogs = await fetchDrawerLogsForWindow(
            newOldest, oldestLoadedAt, activeLocation.id, accountId
          )
          setDrawerLogs(prev => [...prev, ...newLogs])
          setOldestLoadedAt(newOldest)
        }
      }
    } catch (e) {
      console.error('fetchMore error:', e)
    } finally {
      setLoadingMore(false)
    }
  }, [accountId, activeLocation?.id, lastDoc, loadingMore, hasMore, oldestLoadedAt])

  useEffect(() => { fetchOrders() }, [accountId, activeLocation?.id])

  // ── IntersectionObserver — infinite scroll trigger ─────────────────────────
  // root must be parentRef (the inner scroll container), not the window.
  // loading is in deps so the effect re-runs once the scroll container mounts.

  useEffect(() => {
    if (loading) return
    const sentinel  = sentinelRef.current
    const scrollEl  = parentRef.current
    if (!sentinel || !scrollEl) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore && !loadingMore) fetchMore() },
      { root: scrollEl, rootMargin: '300px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchMore, hasMore, loadingMore, loading])

  // ── Server-side search ─────────────────────────────────────────────────────

  useEffect(() => {
    const term = search.trim()
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (!term || term.length < 2) { setServerResults(null); return }

    searchTimerRef.current = setTimeout(async () => {
      if (!accountId || !activeLocation) return
      setSearching(true)
      try {
        const upper = term.toUpperCase()
        const isNumeric = /^\d+$/.test(term)
        const [orderSnap, phoneSnap, numericSnap] = await Promise.all([
          getDocs(query(
            collection(db, 'accounts', accountId, 'orders'),
            where('orderNumberString', '>=', upper),
            where('orderNumberString', '<=', upper + '\uf8ff'),
            limit(50),
          )),
          /\d{3,}/.test(term) ? getDocs(query(
            collection(db, 'accounts', accountId, 'orders'),
            where('customerPhone', '>=', term),
            where('customerPhone', '<=', term + '\uf8ff'),
            limit(50),
          )) : Promise.resolve(null),
          // Also search by integer orderNumber — finds PREFIX-NNNN format when user types just the number
          isNumeric ? getDocs(query(
            collection(db, 'accounts', accountId, 'orders'),
            where('orderNumber', '==', parseInt(term, 10)),
            limit(50),
          )) : Promise.resolve(null),
        ])
        const seen = new Set<string>()
        const merged: Order[] = []
        for (const snap of [orderSnap, phoneSnap, numericSnap]) {
          if (!snap) continue
          for (const doc of snap.docs) {
            if (!seen.has(doc.id)) {
              seen.add(doc.id)
              const o = { id: doc.id, ...doc.data() } as Order
              if (o.locationId === activeLocation.id) merged.push(o)
            }
          }
        }
        merged.sort((a, b) => (b.orderNumber ?? 0) - (a.orderNumber ?? 0))
        setServerResults(merged)
      } catch (e) {
        console.error('Search error:', e)
        setServerResults([])
      } finally {
        setSearching(false)
      }
    }, 350)

    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [search, accountId, activeLocation?.id])

  // ── Build rows ─────────────────────────────────────────────────────────────

  const displayOrders = serverResults ?? orders
  const filteredOrders = displayOrders.filter(o => filter === 'All' || o.status === filter)

  // Only show drawer logs when not searching and filter is 'All'
  const filteredDrawerLogs = (!search.trim() && filter === 'All') ? drawerLogs : []

  const rows: Row[] = [
    ...filteredOrders.map(o => ({
      type: 'order' as const,
      data: o,
      ts: tsToIso(o.createdAt) || o.orderDate || '',
    })),
    ...filteredDrawerLogs.map(d => ({
      type: 'drawer' as const,
      data: d,
      ts: tsToIso(d.openedAt),
    })),
  ].sort((a, b) => b.ts.localeCompare(a.ts))

  // ── Virtualizer ────────────────────────────────────────────────────────────

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => rows[i]?.type === 'drawer' ? 52 : 68,
    overscan: 15,
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        {!isManagement && (
          <button onClick={() => navigate('/pos')}
            className="flex items-center gap-1 text-navy text-sm font-medium hover:opacity-70">
            <ChevronLeft size={18} /> Back
          </button>
        )}
        <h1 className="flex-1 text-center font-bold text-gray-900">Orders</h1>
        <div className="w-16" />
      </div>

      {/* ── Search + filter bar ── */}
      <div className="bg-white border-b border-gray-200 px-5 pt-3 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              inputMode="numeric"
              placeholder="Search by phone or order number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-navy bg-white"
            />
          </div>
          <button onClick={fetchOrders}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex gap-2 mt-3 items-center">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {f}
            </button>
          ))}
          <span className="ml-auto text-sm text-gray-400 shrink-0">
            {searching ? 'Searching…' : `${filteredOrders.length} orders · ${activeLocation?.name ?? ''}`}
          </span>
        </div>
      </div>

      {/* ── Column header (outside virtual scroll — always visible) ── */}
      <div style={COL_STYLE} className="bg-gray-50 border-b border-gray-200 px-5 shrink-0">
        {['Order #', 'Date', 'Customer', 'Amount', 'Paid', 'Due', 'Status', 'Pickup'].map((h, i) => (
          <div key={h}
            className={`py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${
              i >= 3 && i <= 5 ? 'text-right' : ''
            }`}>
            {h}
          </div>
        ))}
      </div>

      {/* ── Body ── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
        </div>

      ) : rows.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          <p className="text-4xl mb-3">🧵</p>
          <p className="text-sm">
            {search.trim() ? 'No orders found for that search' : 'No orders found'}
          </p>
        </div>

      ) : (
        /* Virtual scroll container */
        <div ref={parentRef} className="flex-1 overflow-auto bg-white">

          {/* Spacer sized to total virtual height */}
          <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>

            {rowVirtualizer.getVirtualItems().map(virtualItem => {
              const row = rows[virtualItem.index]
              const baseStyle: React.CSSProperties = {
                position: 'absolute',
                top:    virtualItem.start,
                left:   0,
                right:  0,
                height: virtualItem.size,
              }

              /* ── Drawer log row ── */
              if (row.type === 'drawer') {
                const d = row.data
                const time = d.openedAt?.seconds
                  ? new Date(d.openedAt.seconds * 1000).toLocaleString('en-AU', {
                      day: 'numeric', month: 'short',
                      hour: 'numeric', minute: '2-digit', hour12: true,
                    })
                  : ''
                return (
                  <div key={virtualItem.key} style={baseStyle}
                    className="flex items-center gap-3 px-5 border-b border-amber-100 bg-amber-50/40">
                    <CashDrawerIcon size={17} className="text-amber-500 shrink-0" />
                    <span className="text-xs text-gray-500 w-28 shrink-0">{time}</span>
                    <span className="text-sm font-medium text-amber-700">
                      Drawer Opened — {d.openedBy}
                    </span>
                  </div>
                )
              }

              /* ── Order row ── */
              const order = row.data
              const isDue      = order.stillDueAmount > 0 && order.status !== 'Picked Up'
              const isCancelled = order.status === 'Cancelled'

              return (
                <div key={virtualItem.key} style={{ ...baseStyle, ...COL_STYLE }}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`px-5 items-center border-b border-gray-100 cursor-pointer transition-colors ${
                    isCancelled ? 'opacity-50 bg-gray-50 hover:bg-gray-100' : 'hover:bg-gray-50'
                  }`}>

                  {/* Order # */}
                  <span className={`font-bold text-sm whitespace-nowrap ${isCancelled ? 'text-gray-400 line-through' : 'text-navy'}`}>
                    {order.orderNumberString}
                  </span>

                  {/* Date */}
                  <span className="text-sm text-gray-500">{formatDate(order.orderDate)}</span>

                  {/* Customer */}
                  <div className="min-w-0 pr-3">
                    <p className={`text-sm font-medium truncate ${order.customerName ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {order.customerName || 'Walk-in'}
                    </p>
                    {order.customerPhone && (
                      <p className="text-xs text-gray-400 truncate">{order.customerPhone}</p>
                    )}
                  </div>

                  {/* Amount */}
                  <span className="text-right text-sm font-semibold text-gray-900">
                    ${order.orderAmount.toFixed(2)}
                  </span>

                  {/* Paid */}
                  <span className="text-right text-sm text-gray-600">
                    ${order.paidAmount.toFixed(2)}
                  </span>

                  {/* Due */}
                  <span className={`text-right text-sm ${isDue ? 'font-semibold text-red-500' : 'text-gray-300'}`}>
                    ${order.stillDueAmount.toFixed(2)}
                  </span>

                  {/* Status badge */}
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${
                    order.status === 'In progress'       ? 'bg-blue-50 text-blue-600'     :
                    order.status === 'Ready for Pick Up' ? 'bg-green-100 text-green-700'  :
                    order.status === 'Picked Up'         ? 'bg-gray-100 text-gray-500'    :
                    order.status === 'Cancelled'         ? 'bg-red-100 text-red-500'      :
                    order.status === 'Redo'              ? 'bg-orange-100 text-orange-500':
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {order.status}
                  </span>

                  {/* Pickup date */}
                  <span className="text-xs text-gray-500">{formatDate(order.pickupDate)}</span>

                </div>
              )
            })}

          </div>

          {/* Sentinel — IntersectionObserver watches this */}
          <div ref={sentinelRef} className="h-px" />

          {/* Loading more spinner */}
          {loadingMore && (
            <div className="flex items-center justify-center gap-2 py-5">
              <div className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-400">Loading more orders…</span>
            </div>
          )}

          {/* All loaded message */}
          {!hasMore && !loadingMore && orders.length >= PAGE_SIZE && (
            <div className="text-center py-4 text-xs text-gray-300">— all orders loaded —</div>
          )}

        </div>
      )}

      {/* ── Sheets ── */}
      <OrderDetailSheet
        orderId={selectedOrderId}
        accountId={accountId}
        onClose={() => setSelectedOrderId(null)}
        onEdit={id => { setSelectedOrderId(null); setEditingOrderId(id) }}
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
