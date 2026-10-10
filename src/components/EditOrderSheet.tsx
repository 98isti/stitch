import { useState, useEffect } from 'react'
import { X, Trash2, ChevronLeft } from 'lucide-react'
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
  pickupDate: string
  orderAmount: number
  items: string
  isPaid: boolean
  status: string
}

function isoDate(d: Date) { return d.toISOString().split('T')[0] }

interface Props {
  orderId: string | null
  accountId: string | null
  onClose: () => void
  onBack: () => void  // go back to detail sheet
}

export default function EditOrderSheet({ orderId, accountId, onClose, onBack }: Props) {
  const [order, setOrder] = useState<OrderDoc | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [items, setItems] = useState<OrderItem[]>([])

  useEffect(() => {
    setOrder(null)
    setItems([])
    if (!orderId || !accountId) return
    setLoading(true)
    getDoc(doc(db, 'accounts', accountId, 'orders', orderId)).then(snap => {
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
  }, [orderId, accountId])

  function updateItem(idx: number, field: keyof OrderItem, value: string | number) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (!accountId || !orderId || !order) return
    setSaving(true)
    try {
      const total = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0)
      await updateDoc(doc(db, 'accounts', accountId, 'orders', orderId), {
        customerName, customerPhone, pickupDate,
        items: JSON.stringify(items),
        orderAmount: Math.round(total * 100) / 100,
        stillDueAmount: order.isPaid ? 0 : Math.round(total * 100) / 100,
        paidAmount: order.isPaid ? Math.round(total * 100) / 100 : 0,
        subTotalAmount: Math.round(total / 1.1 * 100) / 100,
        updatedAt: serverTimestamp(),
      })
      onBack() // go back to detail sheet after save
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
  }

  if (!orderId) return null

  const total = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ maxHeight: '82vh' }}>

        {/* Header */}
        <div className="bg-navy px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <button onClick={onBack}
              className="flex items-center gap-1 text-white/70 hover:text-white text-sm transition-colors">
              <ChevronLeft size={18} /> Back
            </button>
            <p className="font-bold text-white text-base">
              Edit {order?.orderNumberString ?? '…'}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={handleSave} disabled={saving || loading}
                className="px-4 py-1.5 rounded-xl bg-white text-navy text-sm font-bold disabled:opacity-40 hover:bg-gray-100 transition-colors">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <X size={15} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Customer */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Customer</p>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-navy bg-white" />
                <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Phone number"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-navy bg-white" />
              </div>

              {/* Pickup date */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Pick-up Date</p>
                <input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)}
                  min={isoDate(new Date())}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-navy bg-white" />
              </div>

              {/* Items */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Items</p>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={item.id} className="bg-white rounded-xl p-3 border border-gray-100">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-bold text-navy uppercase tracking-wide">{item.category}</p>
                        <button onClick={() => removeItem(idx)}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <input value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-navy mb-2" />
                      <div className="flex gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Qty</span>
                          <input type="number" min="1" value={item.quantity}
                            onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-navy" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">$</span>
                          <input type="number" step="0.01" min="0" value={item.unitPrice}
                            onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-navy" />
                        </div>
                        <p className="ml-auto text-sm font-semibold text-gray-900 self-center">
                          ${(item.unitPrice * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="bg-navy text-white rounded-2xl p-4 flex justify-between items-center">
                <span className="font-semibold">New Total</span>
                <span className="text-xl font-bold">${total.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
