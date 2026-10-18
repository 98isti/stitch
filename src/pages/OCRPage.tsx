import { useEffect, useState, useMemo } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Payment {
  amount: number
  paidDate: string   // YYYY-MM-DD
  location: string
}

interface Location {
  id: string
  name: string
  dailyRent?: number
  dailyWages?: number
}

function toYMD(d: Date) {
  return d.toLocaleDateString('en-CA')
}

function getRange(months: number): { start: string; end: string; days: number } {
  const end   = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - months)
  start.setDate(start.getDate() + 1)
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  return { start: toYMD(start), end: toYMD(end), days }
}

function fmtPct(value: number) {
  if (!isFinite(value) || value === 0) return '—'
  return value.toFixed(1) + '%'
}

interface OCRRowProps {
  name: string
  revenue: number
  rent: number
  wages: number
  isTotal?: boolean
}

function OCRRow({ name, revenue, rent, wages, isTotal }: OCRRowProps) {
  const rentPct  = revenue > 0 ? (rent  / revenue) * 100 : 0
  const wagesPct = revenue > 0 ? (wages / revenue) * 100 : 0

  return (
    <div className={`flex items-center border-b border-gray-100 py-3 ${isTotal ? 'bg-blue-50' : ''}`}>
      <div className={`flex-1 px-4 text-sm ${isTotal ? 'font-bold text-blue-600' : 'font-medium text-gray-800'}`}>
        {name}
      </div>
      <div className="w-px h-8 bg-gray-200" />
      <div className={`w-28 text-center text-sm ${isTotal ? 'font-bold text-blue-600' : rentPct > 30 ? 'text-red-500 font-medium' : 'text-gray-700'}`}>
        {fmtPct(rentPct)}
      </div>
      <div className="w-px h-8 bg-gray-200" />
      <div className={`w-28 text-center text-sm ${isTotal ? 'font-bold text-blue-600' : wagesPct > 40 ? 'text-red-500 font-medium' : 'text-gray-700'}`}>
        {fmtPct(wagesPct)}
      </div>
    </div>
  )
}

interface OCRSectionProps {
  title: string
  payments: Payment[]
  locations: Location[]
  days: number
  start: string
  end: string
}

function OCRSection({ title, payments, locations, days, start, end }: OCRSectionProps) {
  // Revenue per location
  const revenueByLoc: Record<string, number> = {}
  payments
    .filter(p => p.paidDate >= start && p.paidDate <= end)
    .forEach(p => {
      revenueByLoc[p.location] = (revenueByLoc[p.location] || 0) + (p.amount || 0)
    })

  const totalRevenue = Object.values(revenueByLoc).reduce((s, v) => s + v, 0)
  const totalRent    = locations.reduce((s, l) => s + (l.dailyRent  || 0) * days, 0)
  const totalWages   = locations.reduce((s, l) => s + (l.dailyWages || 0) * days, 0)

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-gray-900 px-4 mb-3">{title}</h2>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center border-b-2 border-gray-200 py-2 bg-gray-50">
          <div className="flex-1 px-4 text-sm font-bold text-gray-700">Location</div>
          <div className="w-px h-8 bg-gray-300" />
          <div className="w-28 text-center text-xs font-bold text-gray-700 leading-tight px-1">
            Revenue /<br />Rent %
          </div>
          <div className="w-px h-8 bg-gray-300" />
          <div className="w-28 text-center text-xs font-bold text-gray-700 leading-tight px-1">
            Revenue /<br />Wages %
          </div>
        </div>

        {/* All Locations total */}
        <OCRRow
          name="All Locations"
          revenue={totalRevenue}
          rent={totalRent}
          wages={totalWages}
          isTotal
        />

        {/* Per location */}
        {locations.map(loc => (
          <OCRRow
            key={loc.id}
            name={loc.name}
            revenue={revenueByLoc[loc.name] || 0}
            rent={(loc.dailyRent  || 0) * days}
            wages={(loc.dailyWages || 0) * days}
          />
        ))}
      </div>
    </div>
  )
}

export default function OCRPage() {
  const { accountId } = useAuth()
  const { locations }  = useLocations(accountId)
  const navigate       = useNavigate()

  const [payments, setPayments] = useState<Payment[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!accountId) return
    setLoading(true)
    getDocs(collection(db, 'accounts', accountId, 'payments'))
      .then(snap => {
        setPayments(snap.docs.map(d => ({ ...d.data() } as Payment)))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [accountId])

  const range3m  = useMemo(() => getRange(3),  [])
  const range12m = useMemo(() => getRange(12), [])

  // Cast locations to include optional rent/wages from Firestore
  const locs = locations as Location[]

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center px-4 pt-5 pb-4 bg-white border-b border-gray-100 flex-shrink-0">
        <button onClick={() => navigate('/mgmt-more')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 border border-gray-200 mr-3">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-base font-bold text-gray-900">Occupancy Cost Ratio (OCR)</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <OCRSection
              title="Last 3 Months"
              payments={payments}
              locations={locs}
              days={range3m.days}
              start={range3m.start}
              end={range3m.end}
            />
            <OCRSection
              title="Last 12 Months"
              payments={payments}
              locations={locs}
              days={range12m.days}
              start={range12m.start}
              end={range12m.end}
            />
          </>
        )}

        {/* Note about missing rent/wages */}
        <p className="text-xs text-gray-400 text-center px-4 pb-4">
          Locations without daily rent/wages configured will show — until updated in Settings.
        </p>
      </div>
    </div>
  )
}
