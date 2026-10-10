import { useState, useEffect } from 'react'
import { X, Phone, Calendar, Package, MapPin, CreditCard, Pencil, Check } from 'lucide-react'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

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
  discountApplied: boolean
}

const STATUS_FLOW = ['Active', 'Ready', 'Collected']
const STATUS_COLOR: Record<string, string> = {
  'Active':    'bg-blue-50 text-blue-600 border-blue-200',
  'Ready':     'bg-green-50 text-green-700 border-green-200',
  'Collected': 'bg-gray-100 text-gray-500 border-gray-200',
}

function formatDate(str: string) {
  if (!str) return '—'
  try { return new Date(str).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return str }
}

interface Props {
  orderId: string | null
  accountId: string | null
  onClose: () => void
}

export default function OrderDetailSheet({ orderId, accountId, onClose }: Props) {
  const [order, setOrder] = useState<OrderDoc | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!orderId || !accountId) { setOrder(null); return }
    setLoading(true)
    getDoc(doc(db, 'accounts', accountId, 'orders', orderId))
      .then(snap => {
        if (snap.exists()) setOrder({ id: snap.id, ...snap.data() } as OrderDoc)
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [orderId, accountId])

  async function updateStatus(status: string) {
    if (!accountId || !orderId || !order) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'accounts', accountId, 'orders', orderId), { status, updatedAt: serverTimestamp() })
      setOrder(o => o ? { ...o, status } : o)
    } finally { setSaving(false) }
  }

  async function markPaid() {
    if (!accountId || !orderId || !order) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'accounts', accountId, 'orders', orderId), {
        isPaid: true, paidAmount: order.orderAmount, stillDueAmount: 0, updatedAt: serverTimestamp()
      })
      setOrder(o => o ? { ...o, isPaid: true, paidAmount: o.orderAmount, stillDueAmount: 0 } : o)
    } finally { setSaving(false) }
  }

  if (!orderId) return null

  let items: OrderItem[] = []
  if (order) { try { items = JSON.parse(order.items) } catch { items = [] } }

  // Group items by garmentId
  const groups: { garmentId: string; category: string; items: OrderItem[] }[] = []
  items.forEach(item => {
    const gid = item.garmentId ?? item.id
    const g = groups.find(g => g.garmentId === gid)
    if (g) g.items.push(item)
    else groups.push({ garmentId: gid, category: item.category, items: [item] })
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 bg-white rounded-t-3xl w-full max-w-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: '90vh' }}>

        {/* Handle + header */}
        <div className="shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-2" />
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <div>
              {order && <p className="font-bold text-gray-900 text-lg">{order.orderNumberString}</p>}
              {order && <p className="text-xs text-gray-400">{formatDate(order.orderDate)}</p>}
              {loading && <div className="w-24 h-5 bg-gray-100 rounded animate-pulse" />}
            </div>
            <div className="flex items-center gap-2">
              {order && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {order.status}
                </span>
              )}
              <button onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
            </div>
          ) : order ? (
            <>
              {/* Customer */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Customer</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-base shrink-0">
                    {(order.customerName || 'W')[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{order.customerName || 'Walk-in'}</p>
                    {order.customerPhone && (
                      <a href={`tel:${order.customerPhone}`} className="text-sm text-blue-500 flex items-center gap-1 mt-0.5">
                        <Phone size={12} /> {order.customerPhone}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Dates + location */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-start gap-2">
                    <Calendar size={14} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Order date</p>
                      <p className="text-sm font-semibold text-gray-900">{formatDate(order.orderDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Package size={14} className="text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Pick-up date</p>
                      <p className="text-sm font-semibold text-red-500">{formatDate(order.pickupDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Location</p>
                      <p className="text-sm font-semibold text-gray-900">{order.location}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Items</p>
                <div className="space-y-3">
                  {groups.map(group => (
                    <div key={group.garmentId}>
                      <p className="text-xs font-bold text-navy uppercase tracking-wide mb-1">{group.category}</p>
                      {group.items.map((item, i) => (
                        <div key={i} className="flex justify-between items-start pl-2 py-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800">{item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</p>
                            {item.note && <p className="text-xs text-gray-400 italic">{item.note}</p>}
                          </div>
                          <p className="font-semibold text-gray-900 text-sm shrink-0 ml-4">${(item.unitPrice * item.quantity).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal (ex GST)</span>
                    <span>${order.subTotalAmount?.toFixed(2) ?? (order.orderAmount / 1.1).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 text-base">
                    <span>Total (incl GST)</span>
                    <span>${order.orderAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Payment</p>
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard size={14} className="text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-600">{order.paymentMethod}</span>
                  {order.isPaid
                    ? <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Check size={10} /> Paid</span>
                    : <span className="ml-auto text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-semibold">Due ${order.stillDueAmount.toFixed(2)}</span>
                  }
                </div>
                {!order.isPaid && (
                  <button onClick={markPaid} disabled={saving}
                    className="w-full py-2.5 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy-light disabled:opacity-50 transition-colors mt-2">
                    {saving ? 'Saving…' : 'Mark as Paid'}
                  </button>
                )}
              </div>

              {/* Status */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Update Status</p>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_FLOW.map(s => (
                    <button key={s} onClick={() => updateStatus(s)} disabled={saving || order.status === s}
                      className={`py-2.5 rounded-xl text-sm font-semibold transition-colors border-2 ${
                        order.status === s
                          ? 'border-navy bg-navy text-white'
                          : 'border-gray-200 text-gray-600 hover:border-navy/40'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm">Order not found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
