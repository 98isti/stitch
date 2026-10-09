import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { ChevronLeft, Trash2 } from 'lucide-react'

interface OrderItem {
  id: string; category: string; name: string; quantity: number; unitPrice: number; note: string
}

interface OrderDoc {
  id: string
  orderNumberString: string
  customerName: string
  customerPhone: string
  pickupDate: string
  orderAmount: number
  items: string
  isPaid: boolean
  status: string
}

function isoDate(d: Date) { return d.toISOString().split('T')[0] }

export default function EditOrderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { accountId } = useAuth()

  const [order, setOrder] = useState<OrderDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [items, setItems] = useState<OrderItem[]>([])

  useEffect(() => {
    if (!accountId || !id) return
    getDoc(doc(db, 'accounts', accountId, 'orders', id)).then(snap => {
      if (snap.exists()) {
        const o = { id: snap.id, ...snap.data() } as OrderDoc
        setOrder(o)
        setCustomerName(o.customerName || '')
        setCustomerPhone(o.customerPhone || '')
        setPickupDate(o.pickupDate || '')
        try { setItems(JSON.parse(o.items)) } catch { setItems([]) }
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [accountId, id])

  function updateItem(idx: number, field: keyof OrderItem, value: string | number) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (!accountId || !id) return
    setSaving(true)
    try {
      const total = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0)
      await updateDoc(doc(db, 'accounts', accountId, 'orders', id), {
        customerName, customerPhone, pickupDate,
        items: JSON.stringify(items),
        orderAmount: Math.round(total * 100) / 100,
        stillDueAmount: order?.isPaid ? 0 : Math.round(total * 100) / 100,
        paidAmount: order?.isPaid ? Math.round(total * 100) / 100 : 0,
        subTotalAmount: Math.round(total / 1.1 * 100) / 100,
        updatedAt: serverTimestamp(),
      })
      navigate(`/orders/${id}`)
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!order) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
      <p>Order not found</p>
      <button onClick={() => navigate('/orders')} className="mt-4 text-navy text-sm">← Orders</button>
    </div>
  )

  const total = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0)

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate(`/orders/${id}`)}
          className="flex items-center gap-1 text-navy font-medium text-sm hover:opacity-70">
          <ChevronLeft size={20} /> Back
        </button>
        <h1 className="flex-1 text-center font-bold text-gray-900">Edit {order.orderNumberString}</h1>
        <button onClick={handleSave} disabled={saving}
          className="text-sm font-semibold text-navy disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Customer */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Customer</h3>
          <input value={customerName} onChange={e => setCustomerName(e.target.value)}
            placeholder="Customer name" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-navy" />
          <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
            placeholder="Phone" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-navy" />
        </div>

        {/* Pickup date */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Pick-up Date</h3>
          <input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)}
            min={isoDate(new Date())}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-navy" />
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Items</h3>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={item.id} className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
                <div className="flex-1 space-y-2">
                  <p className="text-xs font-semibold text-navy">{item.category}</p>
                  <input value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-navy" />
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">Qty</span>
                      <input type="number" min="1" value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:border-navy" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">$</span>
                      <input type="number" step="0.01" min="0" value={item.unitPrice}
                        onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:border-navy" />
                    </div>
                  </div>
                </div>
                <button onClick={() => removeItem(idx)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="bg-navy text-white rounded-2xl p-4 flex justify-between items-center">
          <span className="font-semibold">New Total</span>
          <span className="text-xl font-bold">${total.toFixed(2)}</span>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-4 rounded-2xl bg-navy text-white font-bold text-base disabled:opacity-50 active:scale-95">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
