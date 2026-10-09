import { useState } from 'react'
import { Delete, ScanLine, UserPlus, ChevronDown, MoreHorizontal, Pencil, Trash2, MapPin, Check } from 'lucide-react'
import ItemPickerSheet from '../components/ItemPickerSheet'
import type { PriceItem } from '../hooks/useItems'
import { useCategories } from '../hooks/useCategories'
import { useItems } from '../hooks/useItems'
import { useLocations } from '../hooks/useLocations'
// removed: '../hooks/useLocations'
import { useAuth } from '../context/AuthContext'

interface SaleItem {
  id: string
  category: string
  name: string
  quantity: number
  unitPrice: number
  note: string
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

export default function POSPage() {
  const { accountId } = useAuth()
  const { categories, loading: catsLoading } = useCategories(accountId)
  const { loading: itemsLoading, getItemsForCategory, getSubCategories } = useItems(accountId)
  const { locations, loading: locsLoading, activeLocation, setActiveLocation } = useLocations(accountId)
  const loading = catsLoading || itemsLoading || locsLoading

  const [amount, setAmount] = useState('0')
  const [items, setItems] = useState<SaleItem[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [pickerCategory, setPickerCategory] = useState<string | null>(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)

  // Pickup date
  const [pickupDate, setPickupDate] = useState<Date>(defaultPickup)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [calMonth, setCalMonth] = useState(() => {
    const d = defaultPickup(); return { year: d.getFullYear(), month: d.getMonth() }
  })

  // Customer
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [showCustomerSheet, setShowCustomerSheet] = useState(false)

  // Discount
  const [discount, setDiscount] = useState<{ type: 'percent' | 'flat'; value: number } | null>(null)
  const [showDiscountSheet, setShowDiscountSheet] = useState(false)
  const [discountInput, setDiscountInput] = useState('')
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent')

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
      id: crypto.randomUUID(), category: 'Custom',
      name: 'Custom Amount', quantity: 1, unitPrice: val, note: ''
    }])
    setAmount('0')
  }

  function handleItemSelected(categoryLabel: string, item: PriceItem) {
    const price = item.itemPrice > 0 ? item.itemPrice : parseFloat(amount) || 0
    setItems(prev => [...prev, {
      id: crypto.randomUUID(), category: categoryLabel,
      name: item.itemName, quantity: 1, unitPrice: price, note: ''
    }])
    if (item.itemPrice > 0) setAmount('0')
    setShowPicker(false)
    setPickerCategory(null)
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function clearSale() { setItems([]); setAmount('0'); setDiscount(null); setCustomerName(''); setCustomerPhone('') }

  // Calendar helpers
  function calDays(year: number, month: number) {
    const first = new Date(year, month, 1).getDay()
    const total = new Date(year, month + 1, 0).getDate()
    return { first, total }
  }
  function prevMonth() {
    setCalMonth(c => {
      if (c.month === 0) return { year: c.year - 1, month: 11 }
      return { year: c.year, month: c.month - 1 }
    })
  }
  function nextMonth() {
    setCalMonth(c => {
      if (c.month === 11) return { year: c.year + 1, month: 0 }
      return { year: c.year, month: c.month + 1 }
    })
  }

  const locationLabel = activeLocation?.name ?? 'Select Location'

  return (
    <div className="flex h-full bg-gray-100 overflow-hidden">

      {/* ── LEFT + MIDDLE wrapper ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT PANEL ── */}
          <div className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">

            {/* Brand + Location */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-100 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <div className="w-6 h-6 bg-navy rounded-md flex items-center justify-center">
                  <span className="text-white text-xs font-bold">S</span>
                </div>
                <span className="font-bold text-navy text-base tracking-tight">Stitch</span>
              </div>

              {/* Location selector */}
              <button
                onClick={() => setShowLocationPicker(true)}
                className="w-full flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <MapPin size={12} className="text-navy shrink-0" />
                <span className="text-xs font-semibold text-gray-800 truncate flex-1 text-left">{locationLabel}</span>
                <ChevronDown size={12} className="text-gray-400 shrink-0" />
              </button>
            </div>

            {/* Keypad display */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="bg-gray-50 rounded-xl px-3 py-3 text-center border border-gray-200">
                <span className="text-4xl font-bold text-gray-900 tabular-nums">${amount}</span>
              </div>
            </div>

            {/* Keypad */}
            <div className="px-3 py-2 grid grid-cols-3 gap-1.5">
              {['1','2','3','4','5','6','7','8','9'].map(k => (
                <button key={k} onClick={() => handleKey(k)}
                  className="h-12 rounded-xl bg-gray-50 text-gray-800 text-xl font-semibold hover:bg-gray-100 active:scale-95 transition-all border border-gray-100">
                  {k}
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

          {/* ── MIDDLE PANEL ── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3">
              {loading ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm">Loading categories...</p>
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
                <span className="text-sm font-bold text-gray-600">{items.length}</span>
              </div>
              <span className="text-sm text-gray-400">items in current sale</span>
              {items.length > 0 && (
                <button onClick={clearSale} className="ml-auto text-xs text-red-400 hover:text-red-600">Clear all</button>
              )}
            </div>
          </div>
        </div>

        {/* ── BOTTOM ACTION BAR ── */}
        <div className="flex shrink-0 bg-white border-t border-gray-200 px-3 py-2 gap-2">
          <button className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 active:scale-95 text-white text-sm font-semibold transition-all">
            Today's Due
          </button>
          <button onClick={() => setShowDiscountSheet(true)}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white text-sm font-semibold transition-all">
            {discount ? `Discount: ${discount.type === 'percent' ? discount.value + '%' : '$' + discount.value.toFixed(2)}` : 'Discount'}
          </button>
          <button className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-sm font-semibold transition-all">
            Open Drawer
          </button>
          <button className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 active:scale-95 text-white text-sm font-semibold transition-all flex items-center justify-center gap-1.5">
            <ScanLine size={15} /> Scan Order
          </button>
        </div>
      </div>

      {/* ── RIGHT PANEL — Current Sale ── */}
      <div className="w-96 shrink-0 bg-white border-l border-gray-200 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-base">Current Sale</h2>
          <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {/* Customer button */}
          <button onClick={() => setShowCustomerSheet(true)}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-2.5 text-sm hover:border-navy hover:text-navy transition-colors">
            {customerName
              ? <><span className="font-semibold text-navy">{customerName}</span>{customerPhone && <span className="text-gray-400 text-xs">{customerPhone}</span>}</>
              : <><UserPlus size={15} className="text-gray-400" /><span className="text-gray-400">Add Customer +</span></>
            }
          </button>

          {/* Pickup date */}
          <button onClick={() => setShowDatePicker(true)}
            className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-500 rounded-xl py-2 text-xs font-medium hover:bg-red-100 transition-colors">
            Pick up: {formatPickupDate(pickupDate)} <ChevronDown size={13} />
          </button>

          {items.length === 0 ? (
            <div className="text-center py-6 text-gray-300 text-sm">
              <p className="text-3xl mb-2">🧵</p>
              <p>No items added yet</p>
            </div>
          ) : (
            <div className="space-y-1 mt-1">
              {items.map(item => (
                <div key={item.id} className="flex items-start gap-2 py-2 px-2 rounded-lg hover:bg-gray-50 group transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-navy truncate">{item.category}</p>
                    <p className="text-sm text-gray-700 truncate">{item.name}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="font-bold text-gray-900 text-sm">${item.unitPrice.toFixed(2)}</span>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1 text-gray-400 hover:text-navy"><Pencil size={11} /></button>
                      <button onClick={() => removeItem(item.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={11} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100">
          <div className="px-4 py-3 bg-gray-50 space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
            </div>
            {discount && discountAmount > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Discount</span><span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline">
              <span className="font-bold text-gray-900">Total</span>
              <span className="text-xs text-gray-400 mx-1">(incl 10% GST)</span>
              <span className="font-bold text-gray-900 text-lg">${total.toFixed(2)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3">
            <button disabled={!total}
              className="py-3.5 rounded-xl bg-gray-200 hover:bg-gray-300 disabled:opacity-40 text-gray-700 font-semibold text-sm active:scale-95">
              Cash ${total.toFixed(2)}
            </button>
            <button disabled={!total}
              className="py-3.5 rounded-xl bg-navy hover:bg-navy-light disabled:opacity-40 text-white font-semibold text-sm active:scale-95">
              Card ${total.toFixed(2)}
            </button>
          </div>
        </div>
      </div>

      {/* Item Picker Sheet */}
      <ItemPickerSheet
        isOpen={showPicker}
        onClose={() => { setShowPicker(false); setPickerCategory(null) }}
        onSelectItem={handleItemSelected}
        categoryCount={categoryCount}
        categories={categories}
        getItemsForCategory={getItemsForCategory}
        getSubCategories={getSubCategories}
        loading={loading}
        initialCategory={pickerCategory}
      />

      {/* ── LOCATION PICKER SHEET ── */}
      {showLocationPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowLocationPicker(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative z-10 bg-white rounded-t-3xl w-full max-w-sm pb-8 pt-4 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="text-center font-bold text-gray-900 text-base mb-3 px-4">Select Location</h3>
            <div className="space-y-1 px-4">
              {locations.map(loc => (
                <button key={loc.id}
                  onClick={() => { setActiveLocation(loc); setShowLocationPicker(false) }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left transition-colors ${
                    activeLocation?.id === loc.id ? 'bg-navy text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
                  }`}>
                  <div>
                    <p className="font-semibold text-sm">{loc.name}</p>
                    {(loc.suburb || loc.streetAddress) && (
                      <p className={`text-xs mt-0.5 ${activeLocation?.id === loc.id ? 'text-blue-100' : 'text-gray-400'}`}>
                        {loc.suburb ?? loc.streetAddress}
                      </p>
                    )}
                  </div>
                  {activeLocation?.id === loc.id && <Check size={16} className="text-white shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── DATE PICKER SHEET ── */}
      {showDatePicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowDatePicker(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative z-10 bg-white rounded-t-3xl w-full max-w-sm pb-8 pt-4 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="text-center font-bold text-gray-900 text-base mb-3 px-4">Pick-up Date</h3>

            {/* Month nav */}
            <div className="flex items-center justify-between px-6 mb-3">
              <button onClick={prevMonth} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">‹</button>
              <span className="font-semibold text-gray-900 text-sm">
                {new Date(calMonth.year, calMonth.month).toLocaleString('en-AU', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={nextMonth} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">›</button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 px-4 mb-1">
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 px-4 gap-y-1">
              {(() => {
                const { first, total } = calDays(calMonth.year, calMonth.month)
                const today = new Date(); today.setHours(0,0,0,0)
                const cells: React.ReactNode[] = []
                for (let i = 0; i < first; i++) cells.push(<div key={`e${i}`} />)
                for (let d = 1; d <= total; d++) {
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

      {/* ── CUSTOMER SHEET ── */}
      {showCustomerSheet && (
        <CustomerSheet
          accountId={accountId}
          
          onSelect={(name, phone) => { setCustomerName(name); setCustomerPhone(phone); setShowCustomerSheet(false) }}
          onClose={() => setShowCustomerSheet(false)}
        />
      )}

      {/* ── DISCOUNT SHEET ── */}
      {showDiscountSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowDiscountSheet(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative z-10 bg-white rounded-t-3xl w-full max-w-sm pb-10 pt-4 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="text-center font-bold text-gray-900 text-base mb-4 px-4">Apply Discount</h3>

            {/* Type toggle */}
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

            {/* Presets */}
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

            {/* Custom input */}
            <div className="px-6 mb-4">
              <input
                type="number"
                value={discountInput}
                onChange={e => setDiscountInput(e.target.value)}
                placeholder={discountType === 'percent' ? 'Custom %' : 'Custom $'}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-lg font-semibold focus:outline-none focus:border-navy"
              />
            </div>

            <div className="flex gap-2 px-6">
              {discount && (
                <button onClick={() => { setDiscount(null); setDiscountInput(''); setShowDiscountSheet(false) }}
                  className="flex-1 py-3 rounded-xl bg-red-50 text-red-500 font-semibold text-sm">
                  Remove
                </button>
              )}
              <button
                onClick={() => {
                  const v = parseFloat(discountInput)
                  if (v > 0) { setDiscount({ type: discountType, value: v }); }
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

// ── CUSTOMER SHEET COMPONENT ──────────────────────────────────────────────────
import { useEffect, useRef, useState as useS } from 'react'
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'

interface Customer { id: string; firstName: string; lastName: string; phone: string; email?: string }

function CustomerSheet({
  accountId, onSelect, onClose
}: {
  accountId: string | null
  onSelect: (name: string, phone: string) => void
  onClose: () => void
}) {
  const [search, setSearch] = useS('')
  const [results, setResults] = useS<Customer[]>([])
  const [searching, setSearching] = useS(false)
  const [addMode, setAddMode] = useS(false)
  const [form, setForm] = useS({ firstName: '', lastName: '', phone: '', email: '' })
  const [saving, setSaving] = useS(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [])

  useEffect(() => {
    if (!accountId || search.length < 2) { setResults([]); return }
    setSearching(true)
    const q = query(
      collection(db, 'accounts', accountId, 'customers'),
      orderBy('firstName'),
    )
    getDocs(q).then(snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer))
      const term = search.toLowerCase()
      setResults(all.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) ||
        c.phone?.includes(term)
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
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 bg-white rounded-t-3xl w-full max-w-sm pb-8 pt-4 shadow-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between px-4 mb-3">
          <h3 className="font-bold text-gray-900 text-base">{addMode ? 'New Customer' : 'Customer Lookup'}</h3>
          {addMode && <button onClick={() => setAddMode(false)} className="text-sm text-navy">← Back</button>}
        </div>

        {!addMode ? (
          <>
            <div className="px-4 mb-3">
              <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name or phone…"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy" />
            </div>
            <div className="flex-1 overflow-y-auto px-4 space-y-1">
              {searching && <p className="text-center text-gray-400 text-sm py-4">Searching…</p>}
              {!searching && results.map(c => (
                <button key={c.id}
                  onClick={() => onSelect(`${c.firstName} ${c.lastName}`.trim(), c.phone)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-left">
                  <div className="w-9 h-9 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-sm">
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
              <button onClick={() => setAddMode(true)}
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
