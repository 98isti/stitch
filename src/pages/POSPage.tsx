import { useState } from 'react'
import { Delete, ScanLine, UserPlus, ChevronDown, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import ItemPickerSheet from '../components/ItemPickerSheet'
import type { PriceItem } from '../hooks/useItems'
import { useCategories } from '../hooks/useCategories'
import { useItems } from '../hooks/useItems'
import { useAuth } from '../context/AuthContext'

interface SaleItem {
  id: string
  category: string
  name: string
  quantity: number
  unitPrice: number
  note: string
}

function getPickupDate() {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  }).format(new Date(Date.now() + 86400000 * 7))
}

export default function POSPage() {
  const { accountId } = useAuth()
  const { categories, loading: catsLoading } = useCategories(accountId)
  const { loading: itemsLoading, getItemsForCategory, getSubCategories } = useItems(accountId)
  const loading = catsLoading || itemsLoading

  const [amount, setAmount] = useState('0')
  const [items, setItems] = useState<SaleItem[]>([])
  const [showPicker, setShowPicker] = useState(false)

  const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
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
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function clearSale() { setItems([]); setAmount('0') }

  return (
    <div className="flex h-full bg-gray-100 overflow-hidden">

      {/* ── LEFT PANEL ── */}
      <div className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <div className="w-6 h-6 bg-navy rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="font-bold text-navy text-base tracking-tight">Stitch</span>
          </div>
          <p className="text-sm font-semibold text-gray-800">Carlingford</p>
          <p className="text-xs text-gray-400 mt-0.5">Staff: Isti</p>
        </div>

        <div className="px-4 py-3 border-b border-gray-100">
          <div className="bg-gray-50 rounded-xl px-3 py-3 text-center border border-gray-200">
            <span className="text-4xl font-bold text-gray-900 tabular-nums">${amount}</span>
          </div>
        </div>

        <div className="px-3 py-2 grid grid-cols-3 gap-1.5">
          {['1','2','3','4','5','6','7','8','9'].map(k => (
            <button key={k} onClick={() => handleKey(k)}
              className="h-12 rounded-xl bg-gray-50 text-gray-800 text-xl font-semibold hover:bg-gray-100 active:scale-95 transition-all border border-gray-100">
              {k}
            </button>
          ))}
          <button onClick={() => handleKey('.')}
            className="h-12 rounded-xl bg-gray-50 text-gray-800 text-xl font-semibold hover:bg-gray-100 active:scale-95 transition-all border border-gray-100">.</button>
          <button onClick={() => handleKey('0')}
            className="h-12 rounded-xl bg-gray-50 text-gray-800 text-xl font-semibold hover:bg-gray-100 active:scale-95 transition-all border border-gray-100">0</button>
          <button onClick={handleDelete}
            className="h-12 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 active:scale-95 transition-all border border-gray-100 flex items-center justify-center">
            <Delete size={17} />
          </button>
        </div>

        <div className="px-3 pb-2">
          <button onClick={handleAddToSale}
            className="w-full py-2.5 rounded-xl bg-gray-600 hover:bg-gray-700 text-white font-semibold text-sm transition-colors active:scale-95">
            Add to Sale
          </button>
        </div>

        <div className="px-3 pb-3 grid grid-cols-2 gap-1.5">
          <button className="py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold">Today's Due</button>
          <button className="py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold">Discount</button>
          <button className="py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold">Open Drawer</button>
          <button className="py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold flex items-center justify-center gap-1">
            <ScanLine size={12} /> Scan
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
                <button key={cat.id} onClick={() => setShowPicker(true)}
                  className="flex flex-col items-center justify-center rounded-2xl bg-white border border-gray-200 text-gray-800 hover:bg-navy hover:text-white hover:border-navy active:scale-95 transition-all shadow-sm min-h-[80px] px-2 text-center group"
                  onClickCapture={() => {}}>
                  <span className="font-semibold text-sm leading-tight">{cat.categoryName}</span>
                  <span className="text-xs text-gray-400 group-hover:text-white/60 mt-1">
                    {getItemsForCategory(cat.categoryName).length} items
                  </span>
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

      {/* ── RIGHT PANEL ── */}
      <div className="w-72 shrink-0 bg-white border-l border-gray-200 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-base">Current Sale</h2>
          <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <button className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-2.5 text-sm text-gray-400 hover:border-navy hover:text-navy transition-colors">
            <UserPlus size={15} /> Add Customer +
          </button>
          <button className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-500 rounded-xl py-2 text-xs font-medium hover:bg-red-100 transition-colors">
            Pick up: {getPickupDate()} <ChevronDown size={13} />
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

      {/* Item Picker — now driven by Firebase */}
      <ItemPickerSheet
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelectItem={handleItemSelected}
        categoryCount={categoryCount}
        categories={categories}
        getItemsForCategory={getItemsForCategory}
        getSubCategories={getSubCategories}
        loading={loading}
      />
    </div>
  )
}
