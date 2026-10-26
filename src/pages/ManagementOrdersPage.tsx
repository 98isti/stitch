import { useEffect, useState, useMemo, useRef } from 'react'
import { collection, query, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { CreditCard, DollarSign, AlertTriangle, ChevronRight, Archive, Search, X } from 'lucide-react'
import { toLocalDate, todayLocal, yesterdayLocal, formatTimeLocal } from '../lib/dateUtils'
import OrderDetailSheet from '../components/OrderDetailSheet'

interface Order {
  id: string
  orderNumber: number
  orderNumberString: string
  customerName: string
  customerPhone?: string
  orderAmount: number
  paidAmount: number
  stillDueAmount: number
  paymentMethod: string
  location: string
  locationId?: string
  orderDate: string
  createdAt?: { seconds: number }
  items: string
  status: string
  shopType?: string
}

interface DrawerLog {
  id: string
  openedAt: { seconds: number }
  openedBy: string
  location: string
}

type Row = { type: 'order'; data: Order; ts: number } | { type: 'drawer'; data: DrawerLog; ts: number }

function formatDateHeader(dateStr: string) {
  const today = todayLocal()
  const yesterday = yesterdayLocal()
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
}

function firstItemName(items: string) {
  try {
    const arr = JSON.parse(items)
    if (!arr?.length) return ''
    const names = arr.map((i: any) => i.name).filter(Boolean)
    return names.join(', ')
  } catch { return '' }
}

function PaymentIcon({ order }: { order: Order }) {
  const isDrawer = order.customerName === 'Drawer Opened'
  const unpaid = (order.stillDueAmount ?? 0) > 0
  const partial = (order.paidAmount ?? 0) > 0 && unpaid

  if (isDrawer) return <Archive size={18} className="text-gray-400 flex-shrink-0" />
  if (order.paidAmount === 0) return <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
  if (partial) return <AlertTriangle size={18} className="text-orange-400 flex-shrink-0" />
  if (order.paymentMethod === 'Card') return <CreditCard size={18} className="text-gray-400 flex-shrink-0" />
  return <DollarSign size={18} className="text-gray-400 flex-shrink-0" />
}

export default function ManagementOrdersPage() {
  const { accountId } = useAuth()
  const { locations } = useLocations(accountId)
  const [orders, setOrders] = useState<Order[]>([])
  const [drawerLogs, setDrawerLogs] = useState<DrawerLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState('All Locations')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const PAGE_SIZE = 250

  useEffect(() => {
    if (!accountId) return
    loadOrders(true)
    loadDrawerLogs()
  }, [accountId])

  // Infinite scroll
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

  async function loadOrders(reset = false) {
    if (!accountId) return
    if (reset) { setLoading(true); setLastDoc(null) }
    else setLoadingMore(true)

    const constraints: any[] = [
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE),
    ]
    if (!reset && lastDoc) constraints.push(startAfter(lastDoc))

    const snap = await getDocs(
      query(collection(db, 'accounts', accountId, 'orders'), ...constraints)
    ).catch(() => null)
    if (!snap) { setLoading(false); setLoadingMore(false); return }

    const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))
    setOrders(prev => reset ? loaded : [...prev, ...loaded])
    setLastDoc(snap.docs[snap.docs.length - 1] ?? null)
    setHasMore(snap.docs.length === PAGE_SIZE)
    if (reset) setLoading(false)
    else setLoadingMore(false)
  }

  async function loadDrawerLogs() {
    if (!accountId) return
    const snap = await getDocs(
      query(collection(db, 'accounts', accountId, 'drawerLogs'), orderBy('openedAt', 'desc'), limit(50))
    ).catch(() => null)
    if (snap) setDrawerLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as DrawerLog)))
  }

  // Merge orders + drawer logs, filter by location, sort newest first
  const rows = useMemo<Row[]>(() => {
    const filteredOrders = selectedLocation === 'All Locations'
      ? orders
      : orders.filter(o => o.location === selectedLocation || (o as any).locationName === selectedLocation)

    const filteredDrawer = selectedLocation === 'All Locations'
      ? drawerLogs
      : drawerLogs.filter(d => d.location === selectedLocation)

    // Only show drawer logs on dates that have real orders loaded
    const loadedOrderDates = new Set(
      filteredOrders.map(o => toLocalDate((o.createdAt?.seconds ?? 0) * 1000))
    )
    const matchedDrawer = filteredDrawer.filter(
      d => loadedOrderDates.has(toLocalDate((d.openedAt?.seconds ?? 0) * 1000))
    )

    const merged: Row[] = [
      ...filteredOrders.map(o => ({ type: 'order' as const, data: o, ts: o.createdAt?.seconds ?? 0 })),
      ...matchedDrawer.map(d => ({ type: 'drawer' as const, data: d, ts: d.openedAt?.seconds ?? 0 })),
    ]
    return merged.sort((a, b) => b.ts - a.ts)
  }, [orders, drawerLogs, selectedLocation])

  // Search results — filter by phone or order number
  const searchResults = useMemo(() => {
    const t = searchTerm.trim()
    if (!t) return []
    const isNum = /^\d+$/.test(t)
    return orders.filter(o => {
      const locMatch = selectedLocation === 'All Locations' || o.location === selectedLocation || (o as any).locationName === selectedLocation
      if (!locMatch) return false
      if (isNum) return String(o.orderNumber).includes(t) || (o.customerPhone ?? '').includes(t)
      return (o.customerPhone ?? '').includes(t) || (o.customerName ?? '').toLowerCase().includes(t.toLowerCase())
    })
  }, [searchTerm, orders, selectedLocation])

  // Group by date — always include today at the top
  const grouped = useMemo(() => {
    const map: Record<string, Row[]> = {}
    // Always seed today so it appears even with no orders
    map[todayLocal()] = []
    for (const row of rows) {
      const date = toLocalDate(row.ts * 1000)
      if (!map[date]) map[date] = []
      map[date].push(row)
    }
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [rows])

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <select
            value={selectedLocation}
            onChange={e => setSelectedLocation(e.target.value)}
            className="text-sm font-semibold text-navy bg-transparent border-none outline-none cursor-pointer"
          >
            <option>All Locations</option>
            {locations.map(l => <option key={l.id}>{l.name}</option>)}
          </select>
        </div>
        {/* Search bar */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by phone or order number…"
            className="w-full pl-9 pr-8 py-2 text-sm rounded-xl bg-gray-100 border border-transparent focus:outline-none focus:border-navy/30 focus:bg-white transition-colors"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : searchTerm.trim() ? (
          /* Search results */
          <div className="flex flex-col gap-2 py-2">
            {searchResults.length === 0 ? (
              <p className="text-center text-gray-400 text-sm mt-12">No orders found</p>
            ) : searchResults.map(order => {
              const due = order.stillDueAmount ?? 0
              const isCancelled = order.status === 'Cancelled'
              return (
                <button key={order.id} onClick={() => setSelectedOrderId(order.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-gray-200 hover:shadow-md active:scale-[0.99] transition-all text-left ${isCancelled ? 'opacity-50' : ''}`}>
                  <PaymentIcon order={order} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-base font-bold ${due > 0 ? 'text-red-500' : 'text-gray-900'}`}>${order.orderAmount?.toFixed(2)}</p>
                    <p className="text-xs text-gray-400 truncate">{firstItemName(order.items)}</p>
                    {(order as any).customerPhone && <p className="text-xs text-gray-400">{(order as any).customerPhone}</p>}
                  </div>
                  <div className="text-right flex-shrink-0 mr-1">
                    <p className="text-xs text-gray-500">{order.location}</p>
                    <p className="text-xs text-gray-400">#{order.orderNumber}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                </button>
              )
            })}
          </div>
        ) : grouped.length === 0 ? (
          <p className="text-center text-gray-400 text-sm mt-12">No orders yet</p>
        ) : (
          <>
            {grouped.map(([date, dateRows]) => (
              <div key={date} className="mb-3">
                {/* Date header — sticky */}
                <p className="sticky top-0 z-10 text-sm font-semibold text-gray-500 px-1 mb-2 mt-3 bg-gray-100 py-1">{formatDateHeader(date)}</p>

                {/* Rows — each row is its own card */}
                <div className="flex flex-col gap-2">
                  {dateRows.map(row => {
                    if (row.type === 'drawer') {
                      return (
                        <div key={row.data.id} className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                          <Archive size={18} className="text-amber-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-amber-700">Drawer Opened</p>
                            <p className="text-xs text-gray-400">by {row.data.openedBy}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-gray-400">{row.data.location}</p>
                            <p className="text-xs text-gray-400">{formatTimeLocal(row.data.openedAt.seconds)}</p>
                          </div>
                        </div>
                      )
                    }

                    const order = row.data
                    const isDrawerOrder = order.customerName === 'Drawer Opened'
                    const due = order.stillDueAmount ?? 0

                    const isCancelled = order.status === 'Cancelled'

                    return (
                      <button key={order.id} onClick={() => setSelectedOrderId(order.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-gray-200 hover:shadow-md active:scale-[0.99] transition-all text-left ${
                          isCancelled ? 'opacity-50' : ''
                        }`}
                        style={isCancelled ? {
                          backgroundImage: 'linear-gradient(to right, #9ca3af, #9ca3af)',
                          backgroundSize: '100% 1px',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                        } : undefined}>
                        <PaymentIcon order={order} />
                        <div className="flex-1 min-w-0">
                          {isDrawerOrder ? (
                            <p className="text-sm font-semibold text-amber-500">Drawer Opened</p>
                          ) : (
                            <>
                              <p className={`text-base font-bold ${due > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                ${order.orderAmount?.toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-400 truncate">{firstItemName(order.items)}</p>
                            </>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0 mr-1">
                          <p className="text-xs text-gray-500">{order.location}</p>
                          <p className="text-xs text-gray-400">{row.ts ? formatTimeLocal(row.ts) : ''}</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="flex justify-center py-4">
              {loadingMore && (
                <div className="w-5 h-5 border-2 border-navy border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          </>
        )}
      </div>

      {/* Order detail sheet */}
      {selectedOrderId && (
        <OrderDetailSheet
          orderId={selectedOrderId}
          accountId={accountId}
          onClose={() => setSelectedOrderId(null)}
          readOnly={false}
        />
      )}
    </div>
  )
}
