import { useState, useEffect, useRef } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Printer, X } from 'lucide-react'
import { usePrinter } from '../context/PrinterContext'
import type { PickupSheetOrder } from '../lib/buildPickupSheet'

interface DayData { count: number; total: number }
type CalendarData = Record<string, DayData> // key: "YYYY-MM-DD"

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function isoToday() {
  return new Date().toISOString().split('T')[0]
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function firstDayOffset(year: number, month: number) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

function pad(n: number) { return String(n).padStart(2, '0') }

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

function CalendarMonth({
  year, month, data, today, isCurrentMonth, onDayTap
}: {
  year: number; month: number; data: CalendarData; today: string
  isCurrentMonth?: boolean; onDayTap: (iso: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (isCurrentMonth && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [isCurrentMonth])

  const days = daysInMonth(year, month)
  const offset = firstDayOffset(year, month)
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1)
  ]

  return (
    <div className="mb-10" ref={ref}>
      <h2 className="text-center text-2xl font-bold text-gray-800 mb-5">{monthLabel(year, month)}</h2>

      <div className="grid grid-cols-7 mb-2">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-center text-sm font-bold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const iso = `${year}-${pad(month + 1)}-${pad(day)}`
          const dayData = data[iso]
          const isToday = iso === today
          const isPast = iso < today

          return (
            <div key={i}
              onClick={() => dayData && onDayTap(iso)}
              className={`min-h-[90px] rounded-xl p-2 flex flex-col ${
                isToday ? 'ring-2 ring-navy bg-navy/5' : ''
              } ${dayData ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}>
              <div className="flex justify-center mb-1.5">
                <span className={`text-base font-bold w-8 h-8 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-navy text-white' : 'text-gray-600'
                }`}>
                  {day}
                </span>
              </div>

              {dayData && (
                <div className={`flex-1 rounded-lg px-1.5 py-2 flex flex-col items-center justify-center text-center ${
                  isPast && !isToday ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-800'
                }`}>
                  <p className="text-sm font-bold leading-tight">
                    {dayData.count} {dayData.count === 1 ? 'order' : 'orders'}
                  </p>
                  <p className="text-sm font-semibold leading-tight mt-0.5">
                    ${dayData.total.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function PickUpPage() {
  const { accountId } = useAuth()
  const { activeLocation } = useLocations(accountId)
  const navigate = useNavigate()
  const printer = usePrinter()

  const [data, setData] = useState<CalendarData>({})
  const [loading, setLoading] = useState(true)

  // Selected day sheet
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [sheetOrders, setSheetOrders] = useState<PickupSheetOrder[]>([])
  const [sheetLoading, setSheetLoading] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [printResult, setPrintResult] = useState<'ok' | 'fail' | null>(null)

  const today = isoToday()

  const now = new Date()
  const months = [
    { year: new Date(now.getFullYear(), now.getMonth() - 1).getFullYear(), month: new Date(now.getFullYear(), now.getMonth() - 1).getMonth() },
    { year: now.getFullYear(), month: now.getMonth() },
    { year: new Date(now.getFullYear(), now.getMonth() + 1).getFullYear(), month: new Date(now.getFullYear(), now.getMonth() + 1).getMonth() },
  ]

  // Load calendar summary
  useEffect(() => {
    if (!accountId || !activeLocation) return
    setLoading(true)
    getDocs(query(
      collection(db, 'accounts', accountId, 'orders'),
      where('location', '==', activeLocation.name),
      where('status', '==', 'In progress'),
    )).then(snap => {
      const map: CalendarData = {}
      snap.docs.forEach(d => {
        const order = d.data()
        const date = order.pickupDate
        if (!date) return
        if (!map[date]) map[date] = { count: 0, total: 0 }
        map[date].count++
        map[date].total += order.orderAmount ?? 0
      })
      setData(map)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [accountId, activeLocation])

  // Load orders for selected date
  async function openDaySheet(iso: string) {
    if (!accountId || !activeLocation) return
    setSelectedDate(iso)
    setSheetOrders([])
    setSheetLoading(true)
    setPrintResult(null)
    try {
      const snap = await getDocs(query(
        collection(db, 'accounts', accountId, 'orders'),
        where('location', '==', activeLocation.name),
        where('pickupDate', '==', iso),
        where('status', '==', 'In progress'),
      ))
      const orders: PickupSheetOrder[] = snap.docs.map(d => {
        const o = d.data()
        let items = []
        try { items = JSON.parse(o.items || '[]') } catch { items = [] }
        return {
          orderNumberString: o.orderNumberString ?? '',
          customerName: o.customerName ?? '',
          customerPhone: o.customerPhone ?? '',
          orderAmount: o.orderAmount ?? 0,
          items: items.map((it: any) => ({
            category: it.category ?? '',
            name: it.name ?? '',
            quantity: it.quantity ?? 1,
            unitPrice: it.unitPrice ?? 0,
            note: it.note ?? '',
          })),
          status: o.status ?? 'In progress',
          orderNote: o.orderNote ?? '',
        }
      })
      // Sort by order number
      orders.sort((a, b) => a.orderNumberString.localeCompare(b.orderNumberString))
      setSheetOrders(orders)
    } finally {
      setSheetLoading(false)
    }
  }

  async function handlePrint() {
    if (!activeLocation || sheetOrders.length === 0 || !selectedDate) return
    setPrinting(true)
    setPrintResult(null)
    try {
      const text = buildPickupSheet({
        businessName: (activeLocation as any).businessName || 'Sew Smart',
        locationName: activeLocation.name,
        date: formatDateLabel(selectedDate).replace(/^\w+, /, ''), // "14 October 2026"
        orders: sheetOrders,
      })
      const ok = await printer.printPickupSheet({
        businessName: (activeLocation as any).businessName || 'Sew Smart',
        locationName: activeLocation.name,
        date: formatDateLabel(selectedDate).replace(/^\w+, /, ''),
        orders: sheetOrders,
      })
      setPrintResult(ok ? 'ok' : 'fail')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/pos')} className="flex items-center gap-1 text-navy text-sm font-medium hover:opacity-70">
          <ChevronLeft size={18} /> Back
        </button>
        <div className="flex-1 text-center">
          <p className="font-bold text-gray-900">Pick-Up Calendar</p>
          {activeLocation && <p className="text-xs text-gray-400">{activeLocation.name} · In progress jobs</p>}
        </div>
        <div className="w-16" />
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 justify-center mb-6 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-100" />
                <span>Upcoming</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-100" />
                <span>Overdue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full ring-2 ring-navy bg-navy/5" />
                <span>Today</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Printer size={12} className="text-gray-400" />
                <span>Tap day to print</span>
              </div>
            </div>

            {months.map(({ year, month }, idx) => (
              <CalendarMonth
                key={`${year}-${month}`}
                year={year} month={month}
                data={data} today={today}
                isCurrentMonth={idx === 1}
                onDayTap={openDaySheet}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Day sheet bottom sheet ── */}
      {selectedDate && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
          onClick={() => setSelectedDate(null)}>
          <div className="relative bg-white rounded-t-3xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}>

            {/* Sheet header */}
            <div className="flex items-center px-5 pt-5 pb-3 shrink-0">
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-base">{formatDateLabel(selectedDate)}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {sheetLoading ? 'Loading…' : `${sheetOrders.length} order${sheetOrders.length !== 1 ? 's' : ''} In progress`}
                </p>
              </div>
              <button onClick={() => setSelectedDate(null)}
                className="p-2 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Order list */}
            <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-3">
              {sheetLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-navy border-t-transparent rounded-full animate-spin" />
                </div>
              ) : sheetOrders.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No In progress orders for this date</p>
              ) : (
                sheetOrders.map((order, i) => (
                  <div key={i} className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm text-gray-900">{order.orderNumberString}</p>
                        <p className="text-sm text-gray-600">{order.customerName}</p>
                        {order.customerPhone && (
                          <p className="text-xs text-gray-400">{order.customerPhone}</p>
                        )}
                      </div>
                      <p className="font-semibold text-navy text-sm">${order.orderAmount.toFixed(2)}</p>
                    </div>
                    {order.items.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {order.items.slice(0, 3).map((it, j) => (
                          <p key={j} className="text-xs text-gray-500 truncate">· {it.name}</p>
                        ))}
                        {order.items.length > 3 && (
                          <p className="text-xs text-gray-400">+{order.items.length - 3} more items</p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Print button */}
            <div className="px-5 pb-8 pt-3 shrink-0 border-t border-gray-100">
              <button
                onClick={handlePrint}
                disabled={sheetLoading || sheetOrders.length === 0 || printing || printer.status !== 'connected'}
                className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-40 ${
                  printResult === 'ok'   ? 'bg-green-500 text-white' :
                  printResult === 'fail' ? 'bg-red-500 text-white' :
                  'bg-navy text-white hover:bg-navy-light'
                }`}>
                <Printer size={18} />
                {printing ? 'Printing…' :
                 printResult === 'ok' ? '✓ Printed' :
                 printResult === 'fail' ? '✗ Print failed' :
                 printer.status !== 'connected' ? 'Printer not connected' :
                 `Print Pickup Sheet (${sheetOrders.length} orders)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
