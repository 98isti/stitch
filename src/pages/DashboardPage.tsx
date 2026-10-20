import { useEffect, useState, useCallback } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'

// ── Types ─────────────────────────────────────────────────────────────────────
interface LocationMetrics {
  locationId: string
  locationName: string
  shopType: string
  orderPrefix: string
  dailyTarget: number
  dailyRent: number
  dailyWages: number
  dailyOther: number
  googlePlaceId: string
  // computed
  todayRevenue: number
  todayOrders: number
  readyForPickup: number
  sales7d: number
  orders7d: number
  aov: number
  revenue30d: number
  labourPct: number
  pl30d: number
  onTimePct: number
  returnCustomerPct: number
  refundPct: number
  googleRating: number | null
  googleReviewCount: number | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtDecimal(n: number) {
  return '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function pct(n: number) { return n.toFixed(1) + '%' }

function dateOffset(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toLocaleDateString('en-CA')
}

function statusColor(revenue: number, target: number) {
  if (target === 0) return 'text-gray-400'
  const ratio = revenue / target
  if (ratio >= 0.85) return 'text-emerald-600'
  if (ratio >= 0.6)  return 'text-amber-500'
  return 'text-red-500'
}
function barColor(revenue: number, target: number) {
  if (target === 0) return 'bg-gray-300'
  const ratio = revenue / target
  if (ratio >= 0.85) return 'bg-emerald-500'
  if (ratio >= 0.6)  return 'bg-amber-400'
  return 'bg-red-400'
}

// ── Google rating fetch ───────────────────────────────────────────────────────
async function fetchGoogleRating(placeId: string, apiKey: string): Promise<{ rating: number; count: number } | null> {
  if (!placeId || !apiKey) return null
  try {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`
    const res = await fetch(url, { headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'rating,userRatingCount' } })
    if (!res.ok) return null
    const json = await res.json()
    if (json.rating && json.userRatingCount) {
      return { rating: json.rating, count: json.userRatingCount }
    }
  } catch { /* ignore */ }
  return null
}

// ── Star display ──────────────────────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400">
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
    </span>
  )
}

// ── Per-location card ─────────────────────────────────────────────────────────
function LocationCard({ m, loading }: { m: LocationMetrics; loading: boolean }) {
  const barPct = m.dailyTarget > 0 ? Math.min(100, (m.todayRevenue / m.dailyTarget) * 100) : 0
  const pl = m.pl30d
  const plColor = pl >= 0 ? 'text-emerald-600' : 'text-red-500'

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="font-bold text-gray-900 text-base">{m.locationName}</h2>
            <p className="text-xs text-gray-400">{m.shopType === 'dryCleaning' ? '👔 Dry Cleaning' : '✂️ Alterations'}</p>
          </div>
          {/* Google rating */}
          {m.googleRating !== null && (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-gray-800">{m.googleRating.toFixed(1)}</span>
                <StarRating rating={m.googleRating} />
              </div>
              <span className="text-xs text-gray-400">{m.googleReviewCount?.toLocaleString()} reviews</span>
            </div>
          )}
        </div>

        {/* Revenue vs target bar */}
        <div className="flex items-center justify-between text-xs mb-1">
          <span className={`font-bold text-base ${statusColor(m.todayRevenue, m.dailyTarget)}`}>
            {loading ? '—' : fmtDecimal(m.todayRevenue)}
          </span>
          <span className="text-gray-400">of {fmt(m.dailyTarget)} target</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className={`h-1.5 rounded-full transition-all ${barColor(m.todayRevenue, m.dailyTarget)}`}
            style={{ width: `${barPct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{m.todayOrders} orders today</span>
          <span>{Math.round(barPct)}%</span>
        </div>
      </div>

      {/* 7-day stats */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Sales 7d</p>
            <p className="text-sm font-bold text-gray-900">{loading ? '—' : fmt(m.sales7d)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Target 7d</p>
            <p className="text-sm font-bold text-gray-900">{fmt(m.dailyTarget * 7)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">AOV</p>
            <p className="text-sm font-bold text-gray-900">{loading ? '—' : (m.orders7d > 0 ? fmt(m.aov) : '—')}</p>
          </div>
        </div>
      </div>

      {/* Performance metrics */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Labour</p>
            <p className={`text-sm font-bold ${m.labourPct > 50 ? 'text-red-500' : m.labourPct > 35 ? 'text-amber-500' : 'text-emerald-600'}`}>
              {loading ? '—' : (m.revenue30d > 0 ? pct(m.labourPct) : '—')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">P/L 30d</p>
            <p className={`text-sm font-bold ${plColor}`}>
              {loading ? '—' : (pl >= 0 ? '+' : '') + fmt(pl)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">On Time</p>
            <p className={`text-sm font-bold ${m.onTimePct < 70 ? 'text-red-500' : m.onTimePct < 85 ? 'text-amber-500' : 'text-emerald-600'}`}>
              {loading ? '—' : pct(m.onTimePct)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Repeat</p>
            <p className={`text-sm font-bold ${m.returnCustomerPct > 40 ? 'text-emerald-600' : 'text-gray-700'}`}>
              {loading ? '—' : pct(m.returnCustomerPct)}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="px-4 py-2.5 flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="text-amber-500 font-medium">{loading ? '—' : m.readyForPickup}</span> ready for pickup
        </span>
        <span className={`flex items-center gap-1 ${m.refundPct > 5 ? 'text-red-500' : 'text-gray-400'}`}>
          Refund: {loading ? '—' : pct(m.refundPct)}
        </span>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { accountId } = useAuth()
  const { locations } = useLocations(accountId)
  const [metrics, setMetrics] = useState<LocationMetrics[]>([])
  const [loading, setLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    if (!accountId || locations.length === 0) return
    setLoading(true)

    const today   = new Date().toLocaleDateString('en-CA')
    const day7ago = dateOffset(7)
    const day30ago = dateOffset(30)

    // ── Fetch Google API key from account doc ─────────────────────────────
    const googleApiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY ?? ''

    // ── Load all data in parallel ─────────────────────────────────────────
    const [paymentsSnap, ordersSnap, customersSnap] = await Promise.all([
      getDocs(query(collection(db, 'accounts', accountId, 'payments'), where('paidDate', '>=', day30ago))),
      getDocs(query(collection(db, 'accounts', accountId, 'orders'), where('orderDate', '>=', day30ago))),
      getDocs(collection(db, 'accounts', accountId, 'customers')),
    ])

    const payments = paymentsSnap.docs.map(d => ({ ...d.data() } as any))
    const orders   = ordersSnap.docs.map(d => ({ ...d.data() } as any))
    const customers = customersSnap.docs.map(d => ({ ...d.data() } as any))

    // ── Compute metrics per location ──────────────────────────────────────
    const results: LocationMetrics[] = await Promise.all(locations.map(async loc => {
      const locPayments = payments.filter(p => p.locationId === loc.id || p.location === loc.name)
      const locOrders   = orders.filter(o => o.locationId === loc.id || o.location === loc.name)
      const locCustomers = customers.filter(c => c.locationId === loc.id || c.locationName === loc.name)

      // Today
      const todayPayments = locPayments.filter(p => p.paidDate === today)
      const todayRevenue  = todayPayments.reduce((s, p) => s + (p.amount ?? 0), 0)
      const todayOrders   = orders.filter(o =>
        (o.locationId === loc.id || o.location === loc.name) && o.orderDate === today
      ).length
      const readyForPickup = orders.filter(o =>
        (o.locationId === loc.id || o.location === loc.name) && o.status === 'Ready for Pick Up'
      ).length

      // 7d
      const payments7d = locPayments.filter(p => p.paidDate >= day7ago)
      const sales7d    = payments7d.reduce((s, p) => s + (p.amount ?? 0), 0)
      const orders7d   = locOrders.filter(o => o.orderDate >= day7ago).length
      const aov        = orders7d > 0 ? sales7d / orders7d : 0

      // 30d
      const revenue30d = locPayments.reduce((s, p) => s + (p.amount ?? 0), 0)
      const dailyRent  = (loc as any).dailyRent  ?? 0
      const dailyWages = (loc as any).dailyWages ?? 0
      const dailyOther = (loc as any).dailyOther ?? 0
      const expenses30d = (dailyRent + dailyWages + dailyOther) * 30
      const pl30d      = revenue30d - expenses30d
      const labourPct  = revenue30d > 0 ? (dailyWages * 30 / revenue30d) * 100 : 0

      // On-time %
      const completedOrders = locOrders.filter(o => o.jobCompletedDate && o.pickupDate && o.status !== 'Cancelled')
      const onTime = completedOrders.filter(o => o.jobCompletedDate <= o.pickupDate).length
      const onTimePct = completedOrders.length > 0 ? (onTime / completedOrders.length) * 100 : 100

      // Return customer %
      const repeatCustomers = locCustomers.filter(c => (c.orderCount ?? 1) > 1).length
      const returnCustomerPct = locCustomers.length > 0 ? (repeatCustomers / locCustomers.length) * 100 : 0

      // Refund %
      const ordersWithRefund = locOrders.filter(o => (o.refundAmount ?? 0) > 0).length
      const refundPct = locOrders.length > 0 ? (ordersWithRefund / locOrders.length) * 100 : 0

      // Google rating
      const placeId = (loc as any).googlePlaceId ?? ''
      const googleResult = await fetchGoogleRating(placeId, googleApiKey)

      return {
        locationId:         loc.id,
        locationName:       loc.name,
        shopType:           loc.shopType ?? 'alterations',
        orderPrefix:        loc.orderPrefix ?? '',
        dailyTarget:        (loc as any).dailyTarget ?? 0,
        dailyRent, dailyWages, dailyOther,
        googlePlaceId:      placeId,
        todayRevenue, todayOrders, readyForPickup,
        sales7d, orders7d, aov,
        revenue30d, labourPct, pl30d,
        onTimePct, returnCustomerPct, refundPct,
        googleRating:       googleResult?.rating ?? null,
        googleReviewCount:  googleResult?.count  ?? null,
      }
    }))

    setMetrics(results)
    setLoading(false)
  }, [accountId, locations])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const totalRevenue = metrics.reduce((s, m) => s + m.todayRevenue, 0)
  const totalTarget  = metrics.reduce((s, m) => s + m.dailyTarget, 0)
  const totalOrders  = metrics.reduce((s, m) => s + m.todayOrders, 0)

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button onClick={loadDashboard}
            className="text-xs text-gray-400 hover:text-navy px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            ↻ Refresh
          </button>
        </div>

        {/* Overall summary */}
        {metrics.length > 1 && (
          <div className="mt-4 bg-white rounded-2xl shadow-sm px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">All Locations Today</span>
              <span className="text-xs text-gray-400">{totalOrders} orders</span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-gray-900">{fmtDecimal(totalRevenue)}</span>
              <span className="text-sm text-gray-400">of {fmt(totalTarget)} target</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${barColor(totalRevenue, totalTarget)}`}
                style={{ width: `${totalTarget > 0 ? Math.min(100, (totalRevenue / totalTarget) * 100) : 0}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Per-location cards */}
      <div className="px-4 pb-6">
        {loading && metrics.length === 0
          ? Array.from({ length: locations.length || 1 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm h-48 mb-4 animate-pulse" />
            ))
          : metrics.map(m => <LocationCard key={m.locationId} m={m} loading={loading} />)
        }
      </div>
    </div>
  )
}
