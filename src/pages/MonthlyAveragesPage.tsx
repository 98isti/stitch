import { useEffect, useState, useMemo } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Order {
  id: string
  orderDate: string        // YYYY-MM-DD
  pickupDate: string       // YYYY-MM-DD
  jobCompletedDate?: string // YYYY-MM-DD
  orderAmount: number
  status: string
  location: string
  locationId?: string
}

function daysBetween(a: string, b: string): number | null {
  if (!a || !b) return null
  const ms = new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()
  if (ms < 0) return null
  return Math.round(ms / 86400000)
}

function avg(nums: number[]): number | null {
  const valid = nums.filter(n => n != null && n >= 0)
  if (!valid.length) return null
  return valid.reduce((s, n) => s + n, 0) / valid.length
}

function getMonthLabels(count: number): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return `${months[parseInt(m) - 1]} ${y}`
}

export default function MonthlyAveragesPage() {
  const { accountId } = useAuth()
  const { locations }  = useLocations(accountId)
  const navigate       = useNavigate()

  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState('all')

  useEffect(() => {
    if (!accountId) return
    setLoading(true)
    getDocs(collection(db, 'accounts', accountId, 'orders'))
      .then(snap => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [accountId])

  const months = useMemo(() => getMonthLabels(12), [])

  const filtered = useMemo(() => {
    if (selectedLocation === 'all') return orders
    const loc = locations.find(l => l.id === selectedLocation)
    if (!loc) return orders
    return orders.filter(o => o.location === loc.name || o.locationId === selectedLocation)
  }, [orders, selectedLocation, locations])

  const monthlyStats = useMemo(() => {
    return months.map(ym => {
      const monthOrders = filtered.filter(o => (o.orderDate || '').startsWith(ym))

      const totalJobs  = monthOrders.length
      const totalSales = monthOrders.reduce((s, o) => s + (o.orderAmount || 0), 0)
      const avgCharge  = totalJobs > 0 ? totalSales / totalJobs : 0

      const pickupTimes = monthOrders
        .map(o => daysBetween(o.orderDate, o.pickupDate))
        .filter((n): n is number => n !== null && n >= 0)

      const completionTimes = monthOrders
        .filter(o => o.jobCompletedDate)
        .map(o => daysBetween(o.orderDate, o.jobCompletedDate!))
        .filter((n): n is number => n !== null && n >= 0)

      return {
        ym,
        totalJobs,
        totalSales,
        avgCharge,
        avgPickupTime:     avg(pickupTimes),
        avgCompletionTime: avg(completionTimes),
      }
    }).filter(m => m.totalJobs > 0)
  }, [filtered, months])

  const selectedLoc = locations.find(l => l.id === selectedLocation)
  const locLabel = selectedLoc?.name ?? 'All Locations'

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center px-4 pt-5 pb-3 bg-white border-b border-gray-100 flex-shrink-0">
        <button onClick={() => navigate('/mgmt-more')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 border border-gray-200 mr-3">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-base font-bold text-gray-900 flex-1 text-center pr-10">Monthly Averages</h1>
      </div>

      {/* Location selector */}
      <div className="flex justify-center py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <select
          value={selectedLocation}
          onChange={e => setSelectedLocation(e.target.value)}
          className="text-base font-semibold text-blue-500 bg-transparent border-none outline-none cursor-pointer">
          <option value="all">All Locations</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : monthlyStats.length === 0 ? (
          <p className="text-center text-gray-400 text-sm mt-12">No data found</p>
        ) : (
          <>
            {/* Location label */}
            <p className="text-sm text-gray-400 mb-3 pl-1">{locLabel}</p>

            {/* Month cards */}
            <div className="space-y-4">
              {monthlyStats.map((m, i) => (
                <div key={m.ym}>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-4">
                    <p className="text-base font-bold text-gray-900 mb-3">{formatMonthLabel(m.ym)}</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Jobs:</span>
                        <span className="text-gray-900 font-medium">{m.totalJobs}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Sales:</span>
                        <span className="text-gray-900 font-medium">${Math.round(m.totalSales).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Avg Charge per Order:</span>
                        <span className="text-gray-900 font-medium">${Math.round(m.avgCharge)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Avg Pickup Time:</span>
                        <span className="text-gray-900 font-medium">
                          {m.avgPickupTime != null ? m.avgPickupTime.toFixed(1) + ' days' : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Avg Completion Time:</span>
                        <span className="text-gray-900 font-medium">
                          {m.avgCompletionTime != null ? m.avgCompletionTime.toFixed(1) + ' days' : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {i < monthlyStats.length - 1 && <div className="border-b border-gray-200 mx-2 mt-4" />}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
