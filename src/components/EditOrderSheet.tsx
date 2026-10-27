import { useState, useEffect } from 'react'
import RefundSheet from './RefundSheet'
import { useStaff } from '../context/StaffContext'
import { usePrinter } from '../context/PrinterContext'
import { X, Trash2, ChevronLeft, Plus } from 'lucide-react'
import ItemPickerSheet from './ItemPickerSheet'
import { useCategories } from '../hooks/useCategories'
import { useItems } from '../hooks/useItems'
import type { PriceItem } from '../hooks/useItems'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

interface OrderItem {
  id: string; garmentId?: string; category: string; name: string; quantity: number; unitPrice: number; note: string
}

interface OrderDoc {
  id: string
  orderNumberString: string
  customerName: string
  customerPhone?: string
  pickupDate: string
  orderAmount: number
  paidAmount: number
  stillDueAmount: number
  discountApplied?: number
  subTotalAmount?: number
  paymentMethod: string
  orderNote?: string
  barcode?: string
  locationId?: string
  location: string
  createdAt?: any
  items: string
  isPaid: boolean
  status: string
}

function isoDate(d: Date) { return d.toLocaleDateString('en-CA') }

interface Props {
  orderId: string | null
  accountId: string | null
  onClose: () => void
  onBack: () => void  // go back to detail sheet
}

export default function EditOrderSheet({ orderId, accountId, onClose, onBack }: Props) {
  const { staff } = useStaff()
  const printer = usePrinter()
  const [showRefundSheet, setShowRefundSheet] = useState(false)
  const [order, setOrder] = useState<OrderDoc | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

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

  const { categories, loading: catsLoading } = useCategories(accountId)
  const { getItemsForCategory, getSubCategories, loading: itemsLoading } = useItems(accountId)

  // Category count for picker (how many of each garment type already added)
  const categoryCount: Record<string, number> = {}
  items.forEach(it => {
    const base = it.category.replace(/\s*\d+$/, '')
    categoryCount[base] = (categoryCount[base] ?? 0) + 1
  })

  function handlePickItem(categoryLabel: string, item: PriceItem) {
    const newItem: OrderItem = {
      id: crypto.randomUUID(),
      garmentId: crypto.randomUUID(),
      category: categoryLabel,
      name: item.itemName,
      quantity: 1,
      unitPrice: item.itemPrice,
      note: '',
    }
    setItems(prev => [...prev, newItem])
  }

  function updateItem(idx: number, field: keyof OrderItem, value: string | number) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleRefundConfirm(amount: number, reason: string) {
    if (!accountId || !orderId || !order) return
    setShowRefundSheet(false)
    await updateDoc(doc(db, 'accounts', accountId, 'orders', orderId), {
      refundAmount: amount,
      refundReason: reason || null,
      refundedBy: staff?.name || 'Unknown',
      refundedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // Auto-reprint receipt with refund reflected
    try {
      const items = JSON.parse(order.items || '[]')
      const subtotal = order.subTotalAmount ?? order.orderAmount
      const pickupDateObj = order.pickupDate ? new Date(order.pickupDate) : null
      const createdDate = order.createdAt ? new Date(order.createdAt.seconds * 1000) : new Date()
      let locData: any = {}
      let acctData: any = {}
      try {
        const [acctSnap, locSnap] = await Promise.all([
          getDoc(doc(db, `accounts/${accountId}`)),
          order.locationId ? getDoc(doc(db, `accounts/${accountId}/locations/${order.locationId}`)) : Promise.resolve(null),
        ])
        if (acctSnap.exists()) acctData = acctSnap.data()
        if (locSnap?.exists()) locData = locSnap.data()
      } catch {}
      await printer.printReceipt({
        businessName: locData.businessName || acctData.businessName || order.location,
        locationName: order.location,
        locationAddress: [
          [locData.shopNumber, locData.shoppingCentre].filter(Boolean).join(' '),
          locData.streetAddress,
          [locData.suburb, locData.state, locData.postCode].filter(Boolean).join(' '),
        ].filter(Boolean).join('\n'),
        locationPhone: locData.phone || locData.businessPhone || '',
        abn: locData.abn || '',
        orderNumber: order.orderNumberString,
        orderDate: createdDate.toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long', year:'numeric' }),
        orderTime: createdDate.toLocaleTimeString('en-AU', { hour:'numeric', minute:'2-digit', hour12:true }),
        servedBy: staff?.name ?? '',
        customerName: order.customerName,
        customerPhone: order.customerPhone ?? '',
        pickupDay: pickupDateObj ? pickupDateObj.toLocaleDateString('en-AU', { weekday:'long' }) : '',
        pickupDateFull: pickupDateObj ? pickupDateObj.toLocaleDateString('en-AU', { day:'numeric', month:'long', year:'numeric' }) : '',
        items: items.map((i: any) => ({ category: i.category, name: i.name, qty: i.quantity, unitPrice: i.unitPrice + (i.extras ?? []).reduce((s: number, e: any) => s + e.price, 0), note: i.note, extras: i.extras ?? [], components: i.components ?? [] })),
        subtotal, discount: (order.discountApplied ?? 0) > 0 ? order.discountApplied : undefined,
        total: order.orderAmount, paidAmount: order.paidAmount, stillDue: order.stillDueAmount,
        paymentMethod: order.paymentMethod, orderNote: order.orderNote || undefined,
        barcode: order.barcode,
        refundAmount: amount,
        refundReason: reason || undefined,
      })
    } catch {}
    onBack()
  }

  async function handleSave() {
    if (!accountId || !orderId || !order) return
    setSaving(true)
    try {
      const total = Math.round(items.reduce((s, it) => s + it.unitPrice * it.quantity, 0) * 100) / 100
      const existingPaid = Math.round((order.paidAmount ?? 0) * 100) / 100
      const newDue = Math.max(0, Math.round((total - existingPaid) * 100) / 100)
      await updateDoc(doc(db, 'accounts', accountId, 'orders', orderId), {
        customerName, customerPhone, pickupDate,
        items: JSON.stringify(items),
        orderAmount: total,
        paidAmount: existingPaid,
        stillDueAmount: newDue,
        isPaid: newDue === 0,
        subTotalAmount: Math.round((total + (order.discountApplied ?? 0)) * 100) / 100,
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

              {/* Add items button */}
              <button onClick={() => setShowPicker(true)}
                className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-navy hover:text-navy transition-colors flex items-center justify-center gap-2 text-sm font-medium mt-1">
                <Plus size={16} /> Add Items
              </button>

              {/* Total */}
              <div className="bg-navy text-white rounded-2xl p-4 flex justify-between items-center">
                <span className="font-semibold">New Total</span>
                <span className="text-xl font-bold">${total.toFixed(2)}</span>
              </div>

              {/* Refund */}
              <button
                onClick={() => setShowRefundSheet(true)}
                className="w-full py-3 rounded-2xl border-2 border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors">
                Record Refund
              </button>
            </>
          )}
        </div>
      </div>

      {showRefundSheet && order && (
        <RefundSheet
          orderNumber={order.orderNumberString}
          orderAmount={order.orderAmount}
          onConfirm={handleRefundConfirm}
          onCancel={() => setShowRefundSheet(false)}
        />
      )}

      <ItemPickerSheet
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelectItem={handlePickItem}
        categoryCount={categoryCount}
        categories={categories}
        getItemsForCategory={getItemsForCategory}
        getSubCategories={getSubCategories}
        loading={catsLoading || itemsLoading}
      />
    </div>
  )
}
