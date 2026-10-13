import { useState, useEffect } from 'react'
import { Phone, ChevronDown, Pencil } from 'lucide-react'
import { doc, getDoc, getDocs, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import SplitPaymentSheet from './SplitPaymentSheet'
import { usePrinter } from '../context/PrinterContext'

import { db } from '../lib/firebase'
import { useStaff } from '../context/StaffContext'
import { useAccountProfile } from '../hooks/useAccountProfile'

interface OrderItem {
  id: string; garmentId?: string; category: string; name: string; quantity: number; unitPrice: number; note: string
}

interface OrderDoc {
  id: string
  orderNumberString: string
  customerName: string
  customerPhone: string
  orderDate: string
  createdAt?: { seconds: number } | null
  completedBy?: string
  orderNote?: string
  barcode?: string
  pickupDate: string
  orderAmount: number
  paidAmount: number
  stillDueAmount: number
  isPaid: boolean
  status: string
  location: string
  paymentMethod: string
  items: string
  subTotalAmount: number
  shopType?: string
  conveyorSlotNumber?: string
  conveyorAssignedBy?: string
  conveyorAssignedAt?: { seconds: number } | null
}

const STATUS_OPTIONS = ['In progress', 'Ready for Pick Up', 'Picked Up', 'Redo']

function formatDate(str: string) {
  if (!str) return '—'
  try { return new Date(str).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return str }
}

function formatDateTime(str: string) {
  if (!str) return '—'
  try { return new Date(str).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return str }
}

function formatTime(ts?: { seconds: number } | null) {
  if (!ts?.seconds) return ''
  return new Date(ts.seconds * 1000).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
}

interface Props {
  orderId: string | null
  accountId: string | null
  onClose: () => void
  onEdit?: (orderId: string) => void
}

const SMS_WORKER_URL = 'https://stitch-sms.supto98.workers.dev'

export default function OrderDetailSheet({ orderId, accountId, onClose, onEdit }: Props) {
  const { staff } = useStaff()
  const accountProfile = useAccountProfile(accountId)
  const [order, setOrder] = useState<OrderDoc | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showSplit, setShowSplit] = useState(false)
  const printer = usePrinter()
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false)
  const [showCompletedByPopup, setShowCompletedByPopup] = useState(false)
  const [staffList, setStaffList] = useState<string[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState('Select Your Name')
  const [showConveyorSlotPopup, setShowConveyorSlotPopup] = useState(false)
  const [conveyorSlotInput, setConveyorSlotInput] = useState('')

  useEffect(() => {
    setOrder(null)
    setShowStatusMenu(false)
    setShowPaymentPrompt(false)
    if (!orderId || !accountId) { return }
    setLoading(true)
    getDoc(doc(db, 'accounts', accountId, 'orders', orderId))
      .then(snap => {
        if (snap.exists()) setOrder({ id: snap.id, ...snap.data() } as OrderDoc)
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [orderId, accountId])

  async function updateStatus(status: string) {
    if (!accountId || !orderId || !order) return
    setShowStatusMenu(false)
    // "Ready for Pick Up" — dry cleaning shows conveyor slot, alterations shows employee selection
    if (status === 'Ready for Pick Up') {
      const isDryCleaning = order.shopType === 'dryCleaning' || order.location === 'St Ives DC'
      if (isDryCleaning) {
        setConveyorSlotInput('')
        setShowConveyorSlotPopup(true)
        return
      }
      setSaving(true)
      try {
        const snap = await getDocs(collection(db, 'accounts', accountId, 'staff'))
        const names = snap.docs
          .map(d => { const s = d.data(); return `${s.firstName} ${s.lastName}`.trim() })
          .filter(Boolean)
          .sort()
        setStaffList(names)
        setSelectedEmployee('Select Your Name')
        setShowCompletedByPopup(true)
      } finally { setSaving(false) }
      return
    }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'accounts', accountId, 'orders', orderId), { status, updatedAt: serverTimestamp() })
      setOrder(o => o ? { ...o, status } : o)
    } finally { setSaving(false) }
  }


  async function confirmConveyorSlot() {
    const slot = conveyorSlotInput.trim()
    if (!slot || !accountId || !orderId || !order) return
    setSaving(true)
    try {
      const assignedBy = staff?.name ?? ''
      await updateDoc(doc(db, 'accounts', accountId, 'orders', orderId), {
        status: 'Ready for Pick Up',
        conveyorSlotNumber: slot,
        conveyorAssignedBy: assignedBy,
        conveyorAssignedAt: serverTimestamp(),
        jobCompletedDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setOrder(o => o ? { ...o, status: 'Ready for Pick Up', conveyorSlotNumber: slot, conveyorAssignedBy: assignedBy } : o)
      setShowConveyorSlotPopup(false)
      if (order.customerPhone && accountProfile) {
        const smsSettings = (accountProfile as any).sms
        const senderName = smsSettings?.senderName || (accountProfile as any).businessName?.slice(0, 11) || 'Stitch'
        const template = smsSettings?.template || 'Hi {firstName}, your order at {businessName} is ready for pick-up! Order: {orderNumber}.'
        fetch(SMS_WORKER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: order.customerPhone,
            from: senderName,
            body: template
              .replace('{firstName}', order.customerName.split(' ')[0])
              .replace('{businessName}', (accountProfile as any).businessName || 'us')
              .replace('{orderNumber}', order.orderNumberString)
              .replace('{balance}', '')
          }),
        }).catch(() => {})
      }
    } finally { setSaving(false) }
  }

  async function confirmReadyForPickup() {
    if (!accountId || !orderId || !order || selectedEmployee === 'Select Your Name') return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'accounts', accountId, 'orders', orderId), {
        status: 'Ready for Pick Up',
        completedBy: selectedEmployee,
        jobCompletedDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setOrder(o => o ? { ...o, status: 'Ready for Pick Up', completedBy: selectedEmployee } : o)
      setShowCompletedByPopup(false)
      // Send SMS if customer has a phone number
      if (order.customerPhone && accountProfile) {
        const smsSettings = (accountProfile as any).sms
        const senderName = smsSettings?.senderName || accountProfile.businessName?.slice(0, 11) || 'Stitch'
        const template = smsSettings?.template ||
          'Hi {firstName}, your order at {businessName} is ready for pick-up! Order: {orderNumber}. {balance}'
        fetch(SMS_WORKER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: order.customerPhone,
            senderName,
            template,
            firstName: order.customerName || 'there',
            orderNumber: order.orderNumberString,
            businessName: accountProfile.businessName || 'Us',
            stillDueAmount: order.stillDueAmount,
          })
        }).then(r => r.json()).then(d => console.log('[SMS]', d)).catch(e => console.error('[SMS]', e))
      }
    } finally { setSaving(false);  }
  }

  async function markSplitPay(cash: number, card: number, stillDue: number) {
    if (!order || !accountId) return
    setShowSplit(false)
    const paidAmount = Math.round((cash + card) * 100) / 100
    const isPaid = stillDue === 0
    const method = cash > 0 && card > 0 ? 'Split' : cash > 0 ? 'Cash' : 'Card'
    const paidDate = new Date().toISOString().split('T')[0]
    await updateDoc(doc(db, 'accounts', accountId, 'orders', orderId!), {
      isPaid, paidAmount, stillDueAmount: stillDue,
      paymentMethod: method, paidAt: serverTimestamp(), paidDate,
      updatedAt: serverTimestamp()
    })
    if (cash > 0) {
      await addDoc(collection(db, 'accounts', accountId, 'payments'), {
        orderId, orderNumberString: order.orderNumberString, customerName: order.customerName,
        amount: cash, method: 'Cash', location: order.location,
        paidBy: 'Staff', paidAt: serverTimestamp(), paidDate,
      })
    }
    if (card > 0) {
      await addDoc(collection(db, 'accounts', accountId, 'payments'), {
        orderId, orderNumberString: order.orderNumberString, customerName: order.customerName,
        amount: card, method: 'Card', location: order.location,
        paidBy: 'Staff', paidAt: serverTimestamp(), paidDate,
      })
    }
    setOrder(o => o ? { ...o, isPaid, paidAmount, stillDueAmount: stillDue, paymentMethod: method } : o)
  }

  async function markPaid(method: string) {
    if (!accountId || !orderId || !order) return
    setSaving(true)
    setShowPaymentPrompt(false)
    try {
      const paidDate = new Date().toISOString().split('T')[0]
      await updateDoc(doc(db, 'accounts', accountId, 'orders', orderId), {
        isPaid: true, paidAmount: order.orderAmount, stillDueAmount: 0,
        paymentMethod: method, paidAt: serverTimestamp(), paidDate,
        updatedAt: serverTimestamp()
      })
      // Write payment record
      await addDoc(collection(db, 'accounts', accountId, 'payments'), {
        orderId,
        orderNumberString: order.orderNumberString,
        customerName: order.customerName,
        amount: Math.round(order.orderAmount * 100) / 100,
        method,
        location: order.location,
        paidBy: staff?.name ?? 'Unknown',
        paidAt: serverTimestamp(),
        paidDate,
      })
      setOrder(o => o ? { ...o, isPaid: true, paidAmount: o.orderAmount, stillDueAmount: 0, paymentMethod: method } : o)
    } finally { setSaving(false) }
  }

  if (!orderId) return null


  let items: OrderItem[] = []
  if (order) { try { items = JSON.parse(order.items) } catch { items = [] } }

  // Group by garmentId
  const groups: { garmentId: string; category: string; items: OrderItem[] }[] = []
  items.forEach(item => {
    const gid = item.garmentId ?? item.id
    const g = groups.find(g => g.garmentId === gid)
    if (g) g.items.push(item)
    else groups.push({ garmentId: gid, category: item.category, items: [item] })
  })

  const STATUS_COLOR: Record<string, string> = {
    'In progress':    'bg-blue-500',
    'Ready for Pick Up':     'bg-green-500',
    'Picked Up': 'bg-gray-400',
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Card */}
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden relative"
        style={{ maxHeight: '82vh' }}>

        {/* ── Dark header ── */}
        <div className="bg-navy px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-start justify-between mb-3">
            {/* LEFT — all info */}
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-navy-light text-xs font-medium mb-0.5">Order #</p>
              <p className="text-white text-xl font-bold leading-tight">
                {order?.orderNumberString ?? '—'}
                {order?.location && <span className="font-normal text-white/60 text-base ml-2">{order.location}</span>}
              </p>
              <p className="text-white/50 text-xs mt-1">
                {order ? formatDateTime(order.orderDate) : '—'}
                {order?.createdAt && <span> at {formatTime(order.createdAt)}</span>}
              </p>
              {staff && <p className="text-white/50 text-xs mt-0.5">Served by: {staff.name}</p>}
            </div>
            {/* RIGHT — status (with completedBy below) + edit button */}
            <div className="flex items-start gap-2 shrink-0">
              {/* Status pill + Completed by stacked */}
              <div className="flex flex-col items-end">
                <div className="relative">
                  <button
                    onClick={() => setShowStatusMenu(m => !m)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold whitespace-nowrap transition-colors ${STATUS_COLOR[order?.status ?? 'Active'] ?? 'bg-blue-500'}`}>
                    {order?.status ?? '—'}
                    <ChevronDown size={14} />
                  </button>
                  {showStatusMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-xl overflow-hidden w-44 border border-gray-100">
                        {STATUS_OPTIONS.map(s => (
                          <button key={s} onClick={() => updateStatus(s)}
                            className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-gray-50 ${
                              order?.status === s ? 'font-semibold text-navy' : 'text-gray-700'
                            }`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {order?.completedBy && (
                  <p className="text-white/50 text-xs text-right mt-1">Completed by: {order.completedBy}</p>
                )}
                {(order?.shopType === 'dryCleaning' || order?.location === 'St Ives DC') && order?.status === 'Ready for Pick Up' && order?.conveyorSlotNumber && (
                  <div className="text-right">
                    <p className="text-white font-bold text-lg">Conveyor # {order.conveyorSlotNumber}</p>
                    {order.conveyorAssignedBy && (
                      <p className="text-white/50 text-xs">Loaded by: {order.conveyorAssignedBy}</p>
                    )}
                  </div>
                )}
              </div>
              {/* Edit button alongside status */}
              {order && onEdit && (
                <button onClick={() => onEdit(orderId!)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors mt-0.5">
                  <Pencil size={14} className="text-white" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
            </div>
          ) : order ? (
            <div className="px-5 py-4 space-y-4">

              {/* Customer + Pickup row */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-base">{order.customerName || 'Walk-in'}</p>
                  {order.customerPhone && (
                    <a href={`tel:${order.customerPhone}`} className="text-blue-500 text-sm flex items-center gap-1 mt-0.5">
                      <Phone size={12} /> {order.customerPhone}
                    </a>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 mb-0.5">Pick up:</p>
                  <p className="text-sm font-semibold text-red-500">{formatDate(order.pickupDate)}</p>
                </div>
              </div>

              {/* Items */}
              <div className="bg-gray-50 rounded-2xl overflow-hidden">
                {groups.map(group => (
                  <div key={group.garmentId}>
                    <div className="px-4 py-2 bg-gray-100">
                      <p className="text-xs font-bold text-navy uppercase tracking-wide">{group.category}</p>
                    </div>
                    {group.items.map((item, i) => (
                      <div key={i} className="flex items-start justify-between px-4 py-3 border-b border-gray-100 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{item.name}</p>
                          {item.note && <p className="text-xs text-gray-400 italic mt-0.5">Note: {item.note}</p>}
                        </div>
                        <div className="flex items-center gap-4 shrink-0 ml-4">
                          <p className="text-sm text-gray-400">x{item.quantity}</p>
                          <p className="text-sm font-semibold text-gray-900">${(item.unitPrice * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Totals */}
                <div className="px-4 py-3 border-t border-gray-200 bg-white">
                  <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>Subtotal</span>
                    <span>${(order.subTotalAmount ?? order.orderAmount / 1.1).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-dashed border-gray-200 my-1.5" />
                  <div className="flex justify-between font-bold text-gray-900 text-base">
                    <span>Total</span>
                    <span>${order.orderAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm">Order not found</p>
            </div>
          )}
        </div>

        {/* Job Completed By popup — shown when changing to Ready for Pick Up */}
        {showCompletedByPopup && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 rounded-3xl">
            <div className="bg-white rounded-2xl shadow-xl p-6 mx-6 w-full">
              <p className="text-center font-bold text-gray-900 text-lg mb-4">Job Completed By:</p>
              <select
                value={selectedEmployee}
                onChange={e => setSelectedEmployee(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 focus:outline-none focus:border-navy mb-2 bg-gray-50">
                <option value="Select Your Name">Select Your Name ↕</option>
                {staffList.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <button
                onClick={confirmReadyForPickup}
                disabled={saving || selectedEmployee === 'Select Your Name'}
                className="w-full py-3.5 rounded-xl bg-gray-600 hover:bg-gray-700 disabled:opacity-40 text-white font-semibold text-base transition-colors mt-2">
                {saving ? 'Saving…' : 'Done'}
              </button>
              <p className="text-center text-red-400 text-xs mt-3 italic">
                (this will send a text message to customer)
              </p>
              <button onClick={() => setShowCompletedByPopup(false)}
                className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors mt-1">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Conveyor Slot Number popup — dry cleaning only */}
        {showConveyorSlotPopup && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 rounded-3xl">
            <div className="bg-white rounded-2xl shadow-xl p-6 mx-6 w-full">
              <p className="text-center font-bold text-gray-900 text-lg mb-2">Conveyor Slot Number</p>
              <p className="text-center text-gray-500 text-sm mb-4">Enter the slot where this order is loaded</p>
              <input
                type="number"
                inputMode="numeric"
                value={conveyorSlotInput}
                onChange={e => setConveyorSlotInput(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 42"
                className="w-full text-center text-3xl font-bold border-2 border-gray-200 rounded-xl py-4 mb-3 focus:outline-none focus:border-navy"
                autoFocus
              />
              <p className="text-center text-red-400 text-xs italic mb-4">
                (this will send a text message to customer)
              </p>
              <button
                onClick={confirmConveyorSlot}
                disabled={!conveyorSlotInput.trim() || saving}
                className="w-full py-3.5 rounded-xl bg-navy disabled:opacity-40 text-white font-semibold text-base transition-colors">
                {saving ? 'Saving…' : 'Confirm'}
              </button>
              <button onClick={() => setShowConveyorSlotPopup(false)}
                className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors mt-1">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Payment method prompt */}
        {showPaymentPrompt && order && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 rounded-3xl">
            <div className="bg-white rounded-2xl shadow-xl p-6 mx-6 w-full">
              <p className="text-center font-bold text-gray-900 text-base mb-1">Collect Payment</p>
              <p className="text-center text-gray-500 text-sm mb-5">${order.stillDueAmount.toFixed(2)} due</p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <button onClick={() => markPaid('Cash')}
                  className="py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-800 font-bold text-sm transition-all">
                  💵 Cash
                </button>
                <button onClick={() => markPaid('Card')}
                  className="py-4 rounded-2xl bg-navy hover:bg-navy-light active:scale-95 text-white font-bold text-sm transition-all">
                  💳 Card
                </button>
                <button onClick={() => { setShowPaymentPrompt(false); setShowSplit(true) }}
                  className="py-4 rounded-2xl bg-purple-50 border-2 border-purple-200 text-purple-700 font-bold text-sm transition-all hover:bg-purple-100">
                  ✂️ Split
                </button>
              </div>
              <button onClick={() => setShowPaymentPrompt(false)}
                className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Order Note */}
        {order?.orderNote && (
          <div className="mx-5 mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <span className="text-lg shrink-0">📝</span>
            <div>
              <p className="text-xs font-bold text-amber-700 mb-0.5">Order Note</p>
              <p className="text-sm text-amber-700 leading-snug">{order.orderNote}</p>
            </div>
          </div>
        )}

        {/* ── Bottom action bar ── */}
        {order && (
          <div className="shrink-0 border-t border-gray-100 px-5 py-4">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <button
                onClick={async () => {
                  if (!order) return
                  const items = JSON.parse(order.items || '[]')
                  const ok = await printer.printLabel({
                    orderNumber: order.orderNumberString,
                    customerName: order.customerName,
                    customerPhone: order.customerPhone,
                    pickupDate: order.pickupDate ?? '',
                    locationName: order.location,
                    orderNote: order.orderNote ?? undefined,
                    items: items.map((i: any) => ({ category: i.category, name: i.name, qty: i.quantity, note: i.note })),
                  })
                  if (!ok) alert(printer.status !== 'connected' ? 'QZ Tray not running — check Settings → Printers' : 'No label printer selected — check Settings → Printers')
                }}
                disabled={printer.status !== 'connected' || !printer.impactPrinter}
                className="py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-600 text-sm font-semibold transition-colors">
                🖨️ Print Labels
              </button>
              <button
                onClick={!order.isPaid ? () => setShowPaymentPrompt(true) : undefined}
                disabled={saving}
                className={`py-3 rounded-2xl text-white text-sm font-bold transition-colors ${
                  order.isPaid ? 'bg-green-500' : 'bg-red-400 hover:bg-red-500'
                }`}>
                {order.isPaid ? '✓ Paid' : `Due $${order.stillDueAmount.toFixed(2)}`}
              </button>
              <button
                onClick={async () => {
                  if (!order) return
                  const items = JSON.parse(order.items || '[]')
                  const subtotal = Math.round((order.orderAmount / 1.1) * 100) / 100
                  const createdDate = order.createdAt ? new Date(order.createdAt.seconds * 1000) : new Date()
                  const pickupDateObj = order.pickupDate ? new Date(order.pickupDate) : null
                  const ok = await printer.printReceipt({
                    businessName: 'Sew Smart Alterations',
                    locationName: order.location,
                    orderNumber: order.orderNumberString,
                    orderDate: createdDate.toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long', year:'numeric' }),
                    orderTime: createdDate.toLocaleTimeString('en-AU', { hour:'numeric', minute:'2-digit', hour12:true }),
                    servedBy: staff?.name ?? '',
                    customerName: order.customerName,
                    customerPhone: order.customerPhone ?? '',
                    pickupDay: pickupDateObj ? pickupDateObj.toLocaleDateString('en-AU', { weekday:'long' }) : '',
                    pickupDateFull: pickupDateObj ? pickupDateObj.toLocaleDateString('en-AU', { day:'numeric', month:'long', year:'numeric' }) : (order.pickupDate ?? ''),
                    items: items.map((i: any) => ({ category: i.category, name: i.name, qty: i.quantity, unitPrice: i.unitPrice, note: i.note })),
                    subtotal,
                    total: order.orderAmount,
                    paidAmount: order.paidAmount,
                    stillDue: order.stillDueAmount,
                    paymentMethod: order.paymentMethod ?? '',
                    orderNote: order.orderNote ?? undefined,
                    barcode: order.barcode,
                  }, 1)
                  if (!ok) alert(`Print failed. Printer status: ${printer.status}, Thermal: ${printer.thermalPrinter ?? 'none selected'}`)
                }}
                className="py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold transition-colors">
                🧾 Print Receipt
              </button>
            </div>
            <p className="text-center text-xs text-gray-400">Payment method: {order.paymentMethod}</p>
            <p className={`text-center text-xs mt-1 ${printer.status === 'connected' ? 'text-green-500' : 'text-red-400'}`}>
              {printer.status === 'connected' ? (printer.thermalPrinter ? `🖨️ ${printer.thermalPrinter}` : '⚠️ No printer selected') : '⚠️ Printer not connected'}
            </p>
          </div>
        )}
      </div>
    </div>

    {showSplit && order && (
      <SplitPaymentSheet
        total={order.stillDueAmount > 0 ? order.stillDueAmount : order.orderAmount}
        onConfirm={markSplitPay}
        onClose={() => setShowSplit(false)}
      />
    )}
    </>
  )
}
