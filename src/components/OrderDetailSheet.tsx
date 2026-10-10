import { useState, useEffect } from 'react'
import { Phone, ChevronDown, X, Pencil } from 'lucide-react'
import { doc, getDoc, getDocs, updateDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useStaff } from '../context/StaffContext'
import { useNavigate } from 'react-router-dom'
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

interface Props {
  orderId: string | null
  accountId: string | null
  onClose: () => void
}

const SMS_WORKER_URL = 'https://stitch-sms.supto98.workers.dev'

export default function OrderDetailSheet({ orderId, accountId, onClose }: Props) {
  const { staff } = useStaff()
  const navigate = useNavigate()
  const accountProfile = useAccountProfile(accountId)
  const [order, setOrder] = useState<OrderDoc | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false)
  const [showCompletedByPopup, setShowCompletedByPopup] = useState(false)
  const [staffList, setStaffList] = useState<string[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState('Select Your Name')

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
    // "Ready for Pick Up" triggers the "Job Completed By" popup
    if (status === 'Ready for Pick Up') {
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

  async function markPaid(method: string) {
    if (!accountId || !orderId || !order) return
    setSaving(true)
    setShowPaymentPrompt(false)
    try {
      await updateDoc(doc(db, 'accounts', accountId, 'orders', orderId), {
        isPaid: true, paidAmount: order.orderAmount, stillDueAmount: 0,
        paymentMethod: method, updatedAt: serverTimestamp()
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Card */}
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden relative"
        style={{ maxHeight: '82vh' }}>

        {/* ── Dark header ── */}
        <div className="bg-navy px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-navy-light text-xs font-medium mb-0.5">Order #</p>
              <p className="text-white text-xl font-bold leading-tight">
                {order?.orderNumberString ?? '—'}
                {order?.location && <span className="font-normal text-white/60 text-base ml-2">{order.location}</span>}
              </p>
              <p className="text-white/50 text-xs mt-1">{order ? formatDateTime(order.orderDate) : '—'}</p>
              {staff && <p className="text-white/50 text-xs mt-0.5">Served by: {staff.name}</p>}
            </div>
            <div className="flex items-center gap-2">
              {/* Status dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(m => !m)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors ${STATUS_COLOR[order?.status ?? 'Active'] ?? 'bg-blue-500'}`}>
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
              {order && (
                <button onClick={() => { onClose(); navigate(`/orders/${orderId}/edit`) }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <Pencil size={14} className="text-white" />
                </button>
              )}
              <button onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <X size={15} className="text-white" />
              </button>
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

        {/* Payment method prompt */}
        {showPaymentPrompt && order && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 rounded-3xl">
            <div className="bg-white rounded-2xl shadow-xl p-6 mx-6 w-full">
              <p className="text-center font-bold text-gray-900 text-base mb-1">Collect Payment</p>
              <p className="text-center text-gray-500 text-sm mb-5">${order.stillDueAmount.toFixed(2)} due</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button onClick={() => markPaid('Cash')}
                  className="py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-800 font-bold text-base transition-all">
                  💵 Cash
                </button>
                <button onClick={() => markPaid('Card')}
                  className="py-4 rounded-2xl bg-navy hover:bg-navy-light active:scale-95 text-white font-bold text-base transition-all">
                  💳 Card
                </button>
              </div>
              <button onClick={() => setShowPaymentPrompt(false)}
                className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Bottom action bar ── */}
        {order && (
          <div className="shrink-0 border-t border-gray-100 px-5 py-4">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <button className="py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold transition-colors">
                Print Labels
              </button>
              <button
                onClick={!order.isPaid ? () => setShowPaymentPrompt(true) : undefined}
                disabled={saving}
                className={`py-3 rounded-2xl text-white text-sm font-bold transition-colors ${
                  order.isPaid ? 'bg-green-500' : 'bg-red-400 hover:bg-red-500'
                }`}>
                {order.isPaid ? '✓ Paid' : `Due $${order.stillDueAmount.toFixed(2)}`}
              </button>
              <button className="py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold transition-colors">
                Print Receipt
              </button>
            </div>
            <p className="text-center text-xs text-gray-400">Payment method: {order.paymentMethod}</p>
          </div>
        )}
      </div>
    </div>
  )
}
