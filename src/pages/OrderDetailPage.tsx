import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { ChevronLeft, Check, Package, Phone, Calendar, CreditCard, MapPin, Pencil } from 'lucide-react'

interface OrderItem {
  id: string; category: string; name: string; quantity: number; unitPrice: number; note: string
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
  discountApplied: boolean
  subTotalAmount: number
}

const STATUS_FLOW = ['Active', 'Ready', 'Collected']

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { accountId } = useAuth()
  const [order, setOrder] = useState<OrderDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!accountId || !id) return
    getDoc(doc(db, 'accounts', accountId, 'orders', id))
      .then(snap => {
        if (snap.exists()) setOrder({ id: snap.id, ...snap.data() } as OrderDoc)
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [accountId, id])

  async function updateStatus(status: string) {
    if (!accountId || !id || !order) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'accounts', accountId, 'orders', id), { status, updatedAt: serverTimestamp() })
      setOrder(o => o ? { ...o, status } : o)
    } finally { setSaving(false) }
  }

  async function markPaid() {
    if (!accountId || !id || !order) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'accounts', accountId, 'orders', id), {
        isPaid: true, paidAmount: order.orderAmount, stillDueAmount: 0, updatedAt: serverTimestamp()
      })
      setOrder(o => o ? { ...o, isPaid: true, paidAmount: o.orderAmount, stillDueAmount: 0 } : o)
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <p className="text-4xl mb-3">🔍</p>
        <p>Order not found</p>
        <button onClick={() => navigate('/orders')} className="mt-4 text-navy text-sm">← Back to Orders</button>
      </div>
    )
  }

  let items: OrderItem[] = []
  try { items = JSON.parse(order.items) } catch { items = [] }

  const STATUS_COLOR: Record<string, string> = {
    'Active':    'bg-blue-50 text-blue-600 border-blue-200',
    'Ready':     'bg-green-50 text-green-700 border-green-200',
    'Collected': 'bg-gray-100 text-gray-500 border-gray-200',
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/orders')}
          className="flex items-center gap-1 text-navy font-medium text-sm hover:opacity-70">
          <ChevronLeft size={20} /> Back
        </button>
        <div className="flex-1 text-center">
          <p className="font-bold text-gray-900">{order.orderNumberString}</p>
          <p className="text-xs text-gray-400">{order.orderDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {order.status}
          </div>
          <button onClick={() => navigate(`/orders/${id}/edit`)}
            className="p-2 rounded-lg hover:bg-gray-100 text-navy transition-colors">
            <Pencil size={15} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

          {/* Customer info */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Customer</h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold">
                  {(order.customerName || 'W')[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{order.customerName || 'Walk-in'}</p>
                  {order.customerPhone && (
                    <a href={`tel:${order.customerPhone}`}
                      className="text-sm text-blue-500 flex items-center gap-1">
                      <Phone size={12} /> {order.customerPhone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <Calendar size={15} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Order date</p>
                  <p className="text-sm font-semibold text-gray-900">{order.orderDate}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Package size={15} className="text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Pick-up date</p>
                  <p className="text-sm font-semibold text-red-500">{order.pickupDate}</p>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 mt-3 pt-3 border-t border-gray-100">
              <MapPin size={15} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Location</p>
                <p className="text-sm font-semibold text-gray-900">{order.location}</p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Items</h3>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-navy font-semibold">{item.category}</p>
                    <p className="text-sm text-gray-800">{item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</p>
                    {item.note && <p className="text-xs text-gray-400 italic">{item.note}</p>}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm shrink-0 ml-3">
                    ${(item.unitPrice * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal (ex GST)</span>
                <span>${order.subTotalAmount?.toFixed(2) ?? '—'}</span>
              </div>
              {order.discountApplied && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Discount</span>
                  <span>-${(order.orderAmount - (order.subTotalAmount ?? 0) * 1.1 < 0 ? 0 : 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900">
                <span>Total (incl GST)</span>
                <span>${order.orderAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Payment</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-gray-400" />
                <span className="text-sm text-gray-700">{order.paymentMethod}</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${order.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
                {order.isPaid ? 'Paid' : `Due $${order.stillDueAmount?.toFixed(2)}`}
              </span>
            </div>
            {!order.isPaid && (
              <button onClick={markPaid} disabled={saving}
                className="mt-3 w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : `Mark Paid — $${order.stillDueAmount?.toFixed(2)}`}
              </button>
            )}
          </div>

          {/* Status actions */}
          {order.status !== 'Collected' && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Update Status</h3>
              <div className="flex gap-2">
                {STATUS_FLOW.filter(s => s !== order.status).map(s => (
                  <button key={s} onClick={() => updateStatus(s)} disabled={saving}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 active:scale-95 ${
                      s === 'Ready' ? 'bg-green-600 text-white hover:bg-green-700' :
                      s === 'Collected' ? 'bg-navy text-white hover:opacity-90' :
                      'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}>
                    {s === 'Ready' ? '✓ Ready' : s === 'Collected' ? '📦 Collected' : s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {order.status === 'Collected' && (
            <div className="bg-green-50 rounded-2xl p-4 border border-green-200 flex items-center gap-3">
              <Check size={20} className="text-green-600 shrink-0" />
              <p className="text-sm font-semibold text-green-700">Order collected by customer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
