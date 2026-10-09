import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Delete, ScanLine, UserPlus, ChevronDown, MoreHorizontal, MapPin, CheckCircle, X } from 'lucide-react'
import EditSaleItemSheet from '../components/EditSaleItemSheet'
import {
  collection, query, getDocs, addDoc, serverTimestamp, orderBy,
  doc, runTransaction
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import ItemPickerSheet from '../components/ItemPickerSheet'
import type { PriceItem } from '../hooks/useItems'
import { useCategories } from '../hooks/useCategories'
import { usePersistedSale } from '../hooks/usePersistedSale'
import { useItems } from '../hooks/useItems'
import { useLocations } from '../hooks/useLocations'
import { useAccountProfile } from '../hooks/useAccountProfile'
import { useAuth } from '../context/AuthContext'
import { useStaff } from '../context/StaffContext'

import type { SaleItem } from '../types/sale'

interface Customer {
  id: string
  firstName: string
  lastName: string
  phone: string
  email?: string
}

function formatPickupDate(d: Date) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  }).format(d)
}

function defaultPickup() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d
}

function isoDate(d: Date) {
  return d.toISOString().split('T')[0]
}

// ── Save Order ────────────────────────────────────────────────────────────────
async function saveOrder({
  accountId,
  locationId,
  locationName,
  orderPrefix,
  customerName,
  customerPhone,
  pickupDate,
  items,
  total,
  discountAmount,
  paymentMethod,
}: {
  accountId: string
  locationId: string
  locationName: string
  orderPrefix: string
  customerName: string
  customerPhone: string
  pickupDate: Date
  items: SaleItem[]
  total: number
  discountAmount: number
  paymentMethod: 'Cash' | 'Card' | 'Pay Later'
}): Promise<string> {
  const counterRef = doc(db, 'accounts', accountId, 'orderCounters', locationId)
  const ordersRef = collection(db, 'accounts', accountId, 'orders')

  let orderNumberString = ''

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef)
    const next = snap.exists() ? (snap.data().counter as number) + 1 : 1
    tx.set(counterRef, { counter: next })
    orderNumberString = `${orderPrefix}-${String(next).padStart(4, '0')}`

    const isPaid = paymentMethod !== 'Pay Later'
    const subTotalAmount = (total - discountAmount) / 1.1

    tx.set(doc(ordersRef), {
      orderNumber: next,
      orderNumberString,
      orderDate: isoDate(new Date()),
      customerName,
      customerPhone,
      pickupDate: isoDate(pickupDate),
      items: JSON.stringify(items.map(i => ({
        id: i.id, category: i.category, name: i.name,
        quantity: i.quantity, unitPrice: i.unitPrice, note: i.note
      }))),
      subTotalAmount: Math.round(subTotalAmount * 100) / 100,
      discountApplied: discountAmount > 0,
      discountType: discountAmount > 0 ? 'flat' : null,
      orderAmount: Math.round(total * 100) / 100,
      paidAmount: isPaid ? Math.round(total * 100) / 100 : 0,
      stillDueAmount: isPaid ? 0 : Math.round(total * 100) / 100,
      isPaid,
      status: 'Active',
      location: locationName,
      paymentMethod,
      createdAt: serverTimestamp(),
    })
  })

  return orderNumberString
}

// ── Success Screen ────────────────────────────────────────────────────────────
function SuccessScreen({
  orderNumber,
  total,
  paymentMethod,
  onDone,
}: {
  orderNumber: string
  total: number
  paymentMethod: string
  onDone: () => void
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-navy flex flex-col items-center justify-center text-white px-8">
      <CheckCircle size={72} className="text-green-400 mb-6" strokeWidth={1.5} />
      <h2 className="text-3xl font-bold mb-2">Order Saved</h2>
      <p className="text-blue-200 text-lg mb-1">{orderNumber}</p>
      <p className="text-2xl font-bold mb-1">${total.toFixed(2)}</p>
      <p className="text-blue-300 text-sm mb-10">{paymentMethod}</p>
      <button onClick={onDone}
        className="px-12 py-4 rounded-2xl bg-white text-navy font-bold text-lg hover:bg-gray-100 transition-colors active:scale-95">
        New Sale
      </button>
    </div>
  )
}

// ── Payment Sheet ─────────────────────────────────────────────────────────────
function PaymentSheet({
  total,
  onPay,
  onClose,
}: {
  total: number
  onPay: (method: 'Cash' | 'Card' | 'Pay Later') => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 bg-white rounded-t-3xl w-full max-w-sm pb-10 pt-4 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h3 className="text-center font-bold text-gray-900 text-lg mb-1 px-4">Charge ${total.toFixed(2)}</h3>
        <p className="text-center text-gray-400 text-sm mb-6 px-4">Select payment method</p>
        <div className="flex flex-col gap-3 px-6">
          <button onClick={() => onPay('Cash')}
            className="w-full py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-lg transition-colors active:scale-95">
            💵 Cash
          </button>
          <button onClick={() => onPay('Card')}
            className="w-full py-4 rounded-2xl bg-navy text-white font-bold text-lg transition-colors active:scale-95 hover:opacity-90">
            💳 Card
          </button>
          <button onClick={() => onPay('Pay Later')}
            className="w-full py-4 rounded-2xl bg-amber-50 border-2 border-amber-200 text-amber-700 font-bold text-lg transition-colors active:scale-95 hover:bg-amber-100">
            🕐 Pay Later
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Customer Sheet ────────────────────────────────────────────────────────────
function CustomerSheet({
  accountId, onSelect, onClose
}: {
  accountId: string | null
  onSelect: (name: string, phone: string) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [searching, setSearching] = useState(false)
  const [addMode, setAddMode] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '' })
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [])

  useEffect(() => {
    if (!accountId || search.length < 2) { setResults([]); return }
    setSearching(true)
    getDocs(query(collection(db, 'accounts', accountId, 'customers'), orderBy('firstName')))
      .then(snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer))
        setResults(all.filter(c =>
          c.phone?.includes(search.trim())
        ).slice(0, 8))
        setSearching(false)
      }).catch(() => setSearching(false))
  }, [search, accountId])

  async function saveNewCustomer() {
    if (!accountId || !form.firstName) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'accounts', accountId, 'customers'), {
        ...form, createdAt: serverTimestamp()
      })
      onSelect(`${form.firstName} ${form.lastName}`.trim(), form.phone)
    } catch { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 bg-white rounded-2xl w-full max-w-sm shadow-2xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-base">{addMode ? 'New Customer' : 'Customer Lookup'}</h3>
          {addMode && <button onClick={() => setAddMode(false)} className="text-sm text-navy font-medium">← Back</button>}
        </div>

        {!addMode ? (
          <>
            <div className="px-4 mb-3">
              <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by phone number…"
                inputMode="tel"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy" />
            </div>
            <div className="flex-1 overflow-y-auto px-4 space-y-1">
              {searching && <p className="text-center text-gray-400 text-sm py-4">Searching…</p>}
              {!searching && results.map(c => (
                <button key={c.id}
                  onClick={() => onSelect(`${c.firstName} ${c.lastName}`.trim(), c.phone)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-left">
                  <div className="w-9 h-9 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-sm shrink-0">
                    {c.firstName[0]}{c.lastName?.[0] ?? ''}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{c.firstName} {c.lastName}</p>
                    {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                  </div>
                </button>
              ))}
              {!searching && search.length >= 2 && results.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">No customers found</p>
              )}
            </div>
            <div className="px-4 mt-3">
              <button onClick={() => { setAddMode(true); setForm(f => ({ ...f, phone: search.trim() })) }}
                className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-navy text-sm font-semibold hover:border-navy transition-colors">
                + Add New Customer
              </button>
            </div>
          </>
        ) : (
          <div className="px-4 space-y-3 flex-1 overflow-y-auto">
            {(['firstName', 'lastName', 'phone', 'email'] as const).map(field => (
              <input key={field} value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                placeholder={field === 'firstName' ? 'First Name *' : field === 'lastName' ? 'Last Name' : field === 'phone' ? 'Phone' : 'Email'}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy"
              />
            ))}
            <button disabled={!form.firstName || saving} onClick={saveNewCustomer}
              className="w-full py-3.5 rounded-xl bg-navy text-white font-semibold text-sm disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Customer'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main POS Page ─────────────────────────────────────────────────────────────
export default function POSPage() {
  const { accountId } = useAuth()
  const { staff, clearStaff } = useStaff()
  const navigate = useNavigate()
  const [showStaffMenu, setShowStaffMenu] = useState(false)
  const { categories, loading: catsLoading } = useCategories(accountId)
  const { loading: itemsLoading, getItemsForCategory, getSubCategories } = useItems(accountId)
  const { loading: locsLoading, activeLocation } = useLocations(accountId)
  const accountProfile = useAccountProfile(accountId)
  const loading = catsLoading || itemsLoading || locsLoading

  const {
    items, setItems,
    amount, setAmount,
    customerName, setCustomerName,
    customerPhone, setCustomerPhone,
    pickupDate, setPickupDate,
    discount, setDiscount,
    clearSale: clearPersistedSale,
  } = usePersistedSale(defaultPickup())
  const [showPicker, setShowPicker] = useState(false)
  const [editingItem, setEditingItem] = useState<SaleItem | null>(null)
  const [pickerCategory, setPickerCategory] = useState<string | null>(null)
  const [longPressGarmentId, setLongPressGarmentId] = useState<string | null>(null)
  const [showSaleMenu, setShowSaleMenu] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)


  const [showDatePicker, setShowDatePicker] = useState(false)
  const [calMonth, setCalMonth] = useState(() => {
    const d = defaultPickup(); return { year: d.getFullYear(), month: d.getMonth() }
  })

  const [showCustomerSheet, setShowCustomerSheet] = useState(false)

  const [showDiscountSheet, setShowDiscountSheet] = useState(false)
  const [discountInput, setDiscountInput] = useState('')
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent')

  const [showPayment, setShowPayment] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<{ orderNumber: string; total: number; method: string } | null>(null)

  const rawTotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const discountAmount = discount
    ? discount.type === 'percent' ? rawTotal * discount.value / 100 : Math.min(discount.value, rawTotal)
    : 0
  const total = rawTotal - discountAmount
  const subtotal = total / 1.1

  const categoryCount: Record<string, number> = {}
  items.forEach(i => {
    const base = i.category.replace(/ \d+$/, '')
    categoryCount[base] = (categoryCount[base] ?? 0) + 1
  })

  function handleKey(key: string) {
    setAmount(prev => {
      if (key === 'C') return '0'
      if (key === '.' && prev.includes('.')) return prev
      if (prev === '0' && key !== '.') return key
      const next = prev + key
      const parts = next.split('.')
      if (parts[1]?.length > 2) return prev
      return next
    })
  }

  function handleDelete() {
    setAmount(prev => prev.length <= 1 ? '0' : prev.slice(0, -1))
  }

  function handleAddToSale() {
    const val = parseFloat(amount)
    if (!val) return
    setItems(prev => [...prev, {
      id: crypto.randomUUID(), garmentId: crypto.randomUUID(),
      category: 'Custom', name: 'Custom Amount', quantity: 1, unitPrice: val, note: ''
    }])
    setAmount('0')
  }

  function handleItemSelected(categoryLabel: string, item: PriceItem) {
    const price = item.itemPrice > 0 ? item.itemPrice : parseFloat(amount) || 0
    // If long-pressed from an existing garment, reuse its garmentId (same group)
    const garmentId = longPressGarmentId ?? crypto.randomUUID()
    // Use base category name (no numbering — cleaner UI)
    const baseCategoryLabel = categoryLabel.replace(/ \d+$/, '')
    setItems(prev => [...prev, {
      id: crypto.randomUUID(), garmentId,
      category: baseCategoryLabel, name: item.itemName, quantity: 1, unitPrice: price, note: ''
    }])
    if (item.itemPrice > 0) setAmount('0')
    setShowPicker(false)
    setPickerCategory(null)
    setLongPressGarmentId(null)
  }

  function updateItem(updated: SaleItem) {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function clearSale() {
    clearPersistedSale()
    setCalMonth(() => { const d = defaultPickup(); return { year: d.getFullYear(), month: d.getMonth() } })
  }

  async function handlePay(method: 'Cash' | 'Card' | 'Pay Later') {
    if (!accountId || !activeLocation || items.length === 0) return
    setShowPayment(false)
    setSaving(true)
    try {
      const prefix = activeLocation.orderPrefix
        || activeLocation.name.slice(0, 3).toUpperCase()
      const orderNumber = await saveOrder({
        accountId,
        locationId: activeLocation.id,
        locationName: activeLocation.name,
        orderPrefix: prefix,
        customerName,
        customerPhone,
        pickupDate,
        items,
        total,
        discountAmount,
        paymentMethod: method,
      })
      setSuccess({ orderNumber, total, method })
      clearSale()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  function calDays(year: number, month: number) {
    const first = new Date(year, month, 1).getDay()
    const total = new Date(year, month + 1, 0).getDate()
    return { first, total }
  }
  function prevMonth() {
    setCalMonth(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 })
  }
  function nextMonth() {
    setCalMonth(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 })
  }

  const locationLabel = activeLocation?.name ?? 'Select Location'

  return (
    <div className="flex h-full bg-gray-100 overflow-hidden">

      {/* Success overlay */}
      {success && (
        <SuccessScreen
          orderNumber={success.orderNumber}
          total={success.total}
          paymentMethod={success.method}
          onDone={() => setSuccess(null)}
        />
      )}

      {/* Saving overlay */}
      {saving && (
        <div className="fixed inset-0 z-[99] bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-2xl px-8 py-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-gray-700">Saving order…</p>
          </div>
        </div>
      )}

      {/* ── LEFT + MIDDLE ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT PANEL */}
          <div className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
            <div className="px-4 pt-4 pb-3 border-b border-gray-100 text-center">
              <div className="flex flex-col items-center mb-2">
                {/* Business name */}
                <div className="text-center px-2">
                  {accountProfile?.logoUrl
                    ? <img src={accountProfile.logoUrl} alt={accountProfile.businessName} className="h-10 object-contain mx-auto" />
                    : <p className="font-bold text-navy text-sm leading-tight">{accountProfile?.businessName ?? 'Your Business'}</p>
                  }
                </div>
                {/* Powered by Stitch */}
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-gray-400 text-xs">powered by</span>
                  <img src="/stitch-logo.png" alt="Stitch" className="h-5 object-contain opacity-40" />
                </div>
              </div>
              <div className="w-full flex flex-col items-center gap-1 px-2.5 py-1">
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-navy shrink-0" />
                  <span className="text-sm font-semibold text-gray-800 truncate">{locationLabel}</span>
                </div>
                {staff && (
                  <div className="relative">
                    <button
                      onClick={() => setShowStaffMenu(m => !m)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors">
                      <span className="text-xs text-gray-600 font-medium">Staff: {staff.name}</span>
                    </button>
                    {showStaffMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowStaffMenu(false)} />
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden w-40">
                          <button
                            onClick={() => { clearStaff(); setShowStaffMenu(false); navigate('/pin') }}
                            className="w-full flex items-center gap-2 px-4 py-3 hover:bg-red-50 text-red-500 text-sm font-medium transition-colors">
                            🔒 Log out?
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-3 border-b border-gray-100">
              <div className="bg-gray-50 rounded-xl px-3 py-3 text-center border border-gray-200">
                <span className="text-4xl font-bold text-gray-900 tabular-nums">${amount}</span>
              </div>
            </div>

            <div className="px-3 py-2 grid grid-cols-3 gap-1.5">
              {['1','2','3','4','5','6','7','8','9'].map(k => (
                <button key={k} onClick={() => handleKey(k)}
                  className="h-12 rounded-xl bg-gray-50 text-gray-800 text-xl font-semibold hover:bg-gray-100 active:scale-95 transition-all border border-gray-100">{k}
                </button>
              ))}
              <button onClick={() => handleKey('.')}
                className="h-12 rounded-xl bg-gray-50 text-gray-800 text-xl font-semibold hover:bg-gray-100 active:scale-95 transition-all border border-gray-100">.
              </button>
              <button onClick={() => handleKey('0')}
                className="h-12 rounded-xl bg-gray-50 text-gray-800 text-xl font-semibold hover:bg-gray-100 active:scale-95 transition-all border border-gray-100">0
              </button>
              <button onClick={handleDelete}
                className="h-12 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 active:scale-95 transition-all border border-gray-100 flex items-center justify-center">
                <Delete size={17} />
              </button>
            </div>



            <div className="px-3 pb-3">
              <button onClick={handleAddToSale}
                className="w-full py-2.5 rounded-xl bg-gray-600 hover:bg-gray-700 text-white font-semibold text-sm transition-colors active:scale-95">
                Add to Sale
              </button>
            </div>
          </div>

          {/* MIDDLE PANEL */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3">
              {loading ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm">Loading…</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {categories.map(cat => (
                    <button key={cat.id}
                      onClick={() => { setPickerCategory(cat.categoryName); setShowPicker(true) }}
                      className="flex items-center justify-center rounded-2xl bg-white border border-gray-200 text-gray-800 hover:bg-navy hover:text-white hover:border-navy active:scale-95 transition-all shadow-sm min-h-[80px] px-2 text-center">
                      <span className="font-semibold text-sm leading-tight">{cat.categoryName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 bg-white px-4 py-2.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-gray-600">{[...new Set(items.map(i => i.garmentId))].length}</span>
              </div>
              <span className="text-sm text-gray-400">
              {items.length === 0 ? 'items in current sale' : 
                `${[...new Set(items.map(i => i.garmentId))].length} garment${[...new Set(items.map(i => i.garmentId))].length !== 1 ? 's' : ''}, ${items.length} service${items.length !== 1 ? 's' : ''}`}
            </span>

            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="flex shrink-0 bg-white border-t border-gray-200 px-3 py-2 gap-2">
          <button onClick={() => navigate('/todaysdue')}
            className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 active:scale-95 text-white text-sm font-semibold transition-all">
            Today's Due
          </button>
          <button onClick={() => setShowDiscountSheet(true)}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white text-sm font-semibold transition-all">
            {discount ? `${discount.type === 'percent' ? discount.value + '%' : '$' + discount.value.toFixed(2)} off` : 'Discount'}
          </button>
          <button className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-sm font-semibold transition-all">
            Open Drawer
          </button>
          <button className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 active:scale-95 text-white text-sm font-semibold transition-all flex items-center justify-center gap-1.5">
            <ScanLine size={15} /> Scan
          </button>
        </div>
      </div>

      {/* ── RIGHT PANEL — Current Sale ── */}
      <div className="w-[440px] shrink-0 bg-white border-l border-gray-200 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 relative">
          <h2 className="font-bold text-gray-900 text-base">Current Sale</h2>
          <button onClick={() => setShowSaleMenu(m => !m)}
            className={`p-1.5 rounded-lg transition-colors ${showSaleMenu ? 'bg-navy text-white' : 'text-gray-400 hover:text-gray-600'}`}>
            <MoreHorizontal size={18} />
          </button>
          {/* Sale menu */}
          {showSaleMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSaleMenu(false)} />
              <div className="absolute top-full right-3 z-50 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden w-48">
                <button onClick={() => { setShowSaleMenu(false); setShowClearConfirm(true) }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-red-50 text-red-500 text-sm font-medium transition-colors border-b border-gray-50">
                  🗑️ Clear Sale
                </button>
                <button onClick={() => setShowSaleMenu(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-gray-50 text-gray-600 text-sm font-medium transition-colors border-b border-gray-50">
                  ⏸️ Save for Later
                </button>
                <button onClick={() => setShowSaleMenu(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-gray-50 text-gray-600 text-sm font-medium transition-colors">
                  📝 Order Note
                </button>
              </div>
            </>
          )}
          {/* Clear Sale confirmation */}
          {showClearConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/30" onClick={() => setShowClearConfirm(false)} />
              <div className="relative z-10 bg-white rounded-2xl shadow-xl p-6 w-72 text-center">
                <p className="text-2xl mb-2">🗑️</p>
                <h3 className="font-bold text-gray-900 text-base mb-1">Clear Sale?</h3>
                <p className="text-sm text-gray-500 mb-5">This will remove all items from the current sale.</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setShowClearConfirm(false)}
                    className="py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={() => { clearSale(); setShowClearConfirm(false) }}
                    className="py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors">
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <button onClick={() => setShowCustomerSheet(true)}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-2.5 text-sm hover:border-navy hover:text-navy transition-colors">
            {customerName
              ? <><span className="font-semibold text-navy truncate">{customerName}</span>{customerPhone && <span className="text-gray-400 text-xs">{customerPhone}</span>}</>
              : <><UserPlus size={15} className="text-gray-400" /><span className="text-gray-400">Add Customer +</span></>
            }
          </button>

          <button onClick={() => setShowDatePicker(true)}
            className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-500 rounded-xl py-2 text-xs font-medium hover:bg-red-100 transition-colors">
            Pick up: {formatPickupDate(pickupDate)} <ChevronDown size={13} />
          </button>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full select-none pointer-events-none">
              <img src="/stitch-logo.png" alt="" className="w-48 object-contain opacity-[0.12]" />
            </div>
          ) : (() => {
            // Group items by garmentId
            const groups: { garmentId: string; category: string; items: SaleItem[] }[] = []
            items.forEach(item => {
              const g = groups.find(g => g.garmentId === item.garmentId)
              if (g) g.items.push(item)
              else groups.push({ garmentId: item.garmentId, category: item.category, items: [item] })
            })
            return (
              <div className="space-y-3 mt-1">
                {groups.map(group => (
                  <div key={group.garmentId}>
                    {/* Garment header — long press to add more services */}
                    <div className="flex items-center justify-between px-2 mb-1">
                      <p className="text-xs font-bold text-navy uppercase tracking-wide">{group.category}</p>
                      <button
                        onClick={() => {
                          setLongPressGarmentId(group.garmentId)
                          setPickerCategory(null)
                          setShowPicker(true)
                        }}
                        className="text-xs text-navy/50 hover:text-navy transition-colors px-1">
                        + Add service
                      </button>
                    </div>
                    {/* Service lines */}
                    {group.items.map(item => (
                      <div key={item.id}
                        className="flex items-center gap-2 py-2 px-3 rounded-xl active:bg-gray-50 ml-1">
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setEditingItem(item)}>
                          <p className="text-sm text-gray-800 truncate">{item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</p>
                          {item.note ? <p className="text-xs text-gray-400 truncate mt-0.5">{item.note}</p> : null}
                        </div>
                        <span className="font-semibold text-gray-900 text-sm shrink-0 cursor-pointer" onClick={() => setEditingItem(item)}>${(item.unitPrice * item.quantity).toFixed(2)}</span>
                        <button onClick={() => removeItem(item.id)}
                          className="w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-400 flex items-center justify-center shrink-0 transition-colors ml-1">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )
          })()}
        </div>

        <div className="border-t border-gray-100">
          <div className="px-4 py-3 bg-gray-50 space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal (ex GST)</span><span>${subtotal.toFixed(2)}</span>
            </div>
            {discount && discountAmount > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Discount</span><span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline">
              <span className="font-bold text-gray-900">Total</span>
              <span className="text-xs text-gray-400 mx-1">(incl GST)</span>
              <span className="font-bold text-gray-900 text-lg">${total.toFixed(2)}</span>
            </div>
          </div>
          <div className="p-3">
            <button
              disabled={!total || saving}
              onClick={() => setShowPayment(true)}
              className="w-full py-4 rounded-2xl bg-navy disabled:opacity-40 text-white font-bold text-lg active:scale-95 transition-all hover:opacity-90">
              Charge ${total.toFixed(2)}
            </button>
          </div>
        </div>
      </div>

      {/* Item Picker Sheet */}
      <ItemPickerSheet
        isOpen={showPicker}
        onClose={() => { setShowPicker(false); setPickerCategory(null); setLongPressGarmentId(null) }}
        onSelectItem={handleItemSelected}
        categoryCount={categoryCount}
        categories={categories}
        getItemsForCategory={getItemsForCategory}
        getSubCategories={getSubCategories}
        loading={loading}
        initialCategory={pickerCategory}
      />

      {/* Payment Sheet */}
      {showPayment && (
        <PaymentSheet total={total} onPay={handlePay} onClose={() => setShowPayment(false)} />
      )}



      {/* Edit Sale Item Sheet */}
      <EditSaleItemSheet
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={updateItem}
      />

      {/* Date Picker */}
      {showDatePicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowDatePicker(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative z-10 bg-white rounded-t-3xl w-full max-w-sm pb-8 pt-4 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="text-center font-bold text-gray-900 text-base mb-3 px-4">Pick-up Date</h3>
            <div className="flex items-center justify-between px-6 mb-3">
              <button onClick={prevMonth} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 text-lg">‹</button>
              <span className="font-semibold text-gray-900 text-sm">
                {new Date(calMonth.year, calMonth.month).toLocaleString('en-AU', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={nextMonth} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 text-lg">›</button>
            </div>
            <div className="grid grid-cols-7 px-4 mb-1">
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 px-4 gap-y-1">
              {(() => {
                const { first, total: daysTotal } = calDays(calMonth.year, calMonth.month)
                const today = new Date(); today.setHours(0,0,0,0)
                const cells: React.ReactNode[] = []
                for (let i = 0; i < first; i++) cells.push(<div key={`e${i}`} />)
                for (let d = 1; d <= daysTotal; d++) {
                  const date = new Date(calMonth.year, calMonth.month, d)
                  const isPast = date < today
                  const isSelected = date.toDateString() === pickupDate.toDateString()
                  const isToday = date.toDateString() === today.toDateString()
                  cells.push(
                    <button key={d} disabled={isPast}
                      onClick={() => { setPickupDate(date); setShowDatePicker(false) }}
                      className={`h-9 w-9 mx-auto rounded-full text-sm font-medium transition-colors ${
                        isSelected ? 'bg-navy text-white' :
                        isToday ? 'bg-tan/30 text-navy font-bold' :
                        isPast ? 'text-gray-300 cursor-not-allowed' :
                        'text-gray-800 hover:bg-gray-100'
                      }`}>
                      {d}
                    </button>
                  )
                }
                return cells
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Customer Sheet */}
      {showCustomerSheet && (
        <CustomerSheet
          accountId={accountId}
          onSelect={(name, phone) => { setCustomerName(name); setCustomerPhone(phone); setShowCustomerSheet(false) }}
          onClose={() => setShowCustomerSheet(false)}
        />
      )}

      {/* Discount Sheet */}
      {showDiscountSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowDiscountSheet(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative z-10 bg-white rounded-t-3xl w-full max-w-sm pb-10 pt-4 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="text-center font-bold text-gray-900 text-base mb-4 px-4">Apply Discount</h3>
            <div className="flex gap-2 px-6 mb-4">
              <button onClick={() => setDiscountType('percent')}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${discountType === 'percent' ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600'}`}>
                %
              </button>
              <button onClick={() => setDiscountType('flat')}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${discountType === 'flat' ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600'}`}>
                $ Flat
              </button>
            </div>
            {discountType === 'percent' && (
              <div className="flex gap-2 px-6 mb-4">
                {[10, 20, 50].map(p => (
                  <button key={p}
                    onClick={() => { setDiscount({ type: 'percent', value: p }); setShowDiscountSheet(false) }}
                    className="flex-1 py-3 rounded-xl bg-tan/30 hover:bg-tan/50 text-navy font-bold text-lg transition-colors">
                    {p}%
                  </button>
                ))}
              </div>
            )}
            <div className="px-6 mb-4">
              <input type="number" value={discountInput} onChange={e => setDiscountInput(e.target.value)}
                placeholder={discountType === 'percent' ? 'Custom %' : 'Custom $'}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-lg font-semibold focus:outline-none focus:border-navy" />
            </div>
            <div className="flex gap-2 px-6">
              {discount && (
                <button onClick={() => { setDiscount(null); setDiscountInput(''); setShowDiscountSheet(false) }}
                  className="flex-1 py-3 rounded-xl bg-red-50 text-red-500 font-semibold text-sm">
                  Remove
                </button>
              )}
              <button onClick={() => {
                const v = parseFloat(discountInput)
                if (v > 0) setDiscount({ type: discountType, value: v })
                setShowDiscountSheet(false)
              }}
                className="flex-1 py-3 rounded-xl bg-navy text-white font-semibold text-sm">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
