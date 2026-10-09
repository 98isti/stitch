import { useState } from 'react'
import { Delete, ScanLine, UserPlus, ChevronDown, MoreHorizontal } from 'lucide-react'

const CATEGORIES = [
  'Wedding', 'Blazer', 'Blouse',
  'Button', 'Dress', 'Dry Cleaning',
  'Elastic', 'Evening / Formal', 'Measurement',
  'Miscellaneous', 'Pant', 'Patch',
  'Pocket', 'Repair', 'School',
  'Shirt', 'Skirt', 'Trouser',
]

interface SaleItem {
  category: string
  amount: number
}

const PICKUP_DATE = new Intl.DateTimeFormat('en-AU', {
  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
}).format(new Date(Date.now() + 86400000 * 7))

export default function POSPage() {
  const [amount, setAmount] = useState('0')
  const [items, setItems] = useState<SaleItem[]>([])
  const [customer, setCustomer] = useState<string | null>(null)

  const total = items.reduce((sum, i) => sum + i.amount, 0)
  const subtotal = total / 1.1
  const gstAmount = total - subtotal

  function handleKey(key: string) {
    setAmount(prev => {
      if (key === 'C') return '0'
      if (key === '.' && prev.includes('.')) return prev
      if (prev === '0' && key !== '.') return key
      const next = prev + key
      // Max 2 decimal places
      const parts = next.split('.')
      if (parts[1]?.length > 2) return prev
      return next
    })
  }

  function handleDelete() {
    setAmount(prev => {
      if (prev.length <= 1) return '0'
      return prev.slice(0, -1)
    })
  }

  function addToSale(category: string) {
    const val = parseFloat(amount)
    if (!val) return
    setItems(prev => [...prev, { category, amount: val }])
    setAmount('0')
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="flex h-full bg-gray-100 overflow-hidden">

      {/* ── LEFT PANEL ── */}
      <div className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Location + staff */}
        <div className="px-4 pt-4 pb-2 border-b border-gray-100 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-5 h-5 bg-navy rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="font-bold text-navy text-sm">Stitch</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Carlingford</p>
          <p className="text-xs text-gray-400 mt-0.5">Staff: Isti</p>
        </div>

        {/* Amount display */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
            <span className="text-4xl font-bold text-gray-900">
              ${parseFloat(amount).toFixed(2) === amount || !amount.includes('.') ? amount : amount}
            </span>
          </div>
        </div>

        {/* Keypad */}
        <div className="px-3 py-2 grid grid-cols-3 gap-1.5 flex-1">
          {['1','2','3','4','5','6','7','8','9','.','0'].map(k => (
            <button
              key={k}
              onClick={() => handleKey(k)}
              className="aspect-square rounded-xl bg-gray-50 text-gray-800 text-xl font-semibold hover:bg-gray-100 active:bg-gray-200 transition-colors flex items-center justify-center"
            >
              {k}
            </button>
          ))}
          <button
            onClick={handleDelete}
            className="aspect-square rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors flex items-center justify-center"
          >
            <Delete size={18} />
          </button>
        </div>

        {/* Add to Sale */}
        <div className="px-3 pb-2">
          <button
            onClick={() => {}}
            className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-800 text-white font-semibold text-sm transition-colors"
          >
            Add to Sale
          </button>
        </div>

        {/* Action buttons */}
        <div className="px-3 pb-3 grid grid-cols-2 gap-1.5">
          <button className="py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold transition-colors">
            Today's Due
          </button>
          <button className="py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors">
            Discount
          </button>
          <button className="py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors">
            Open Drawer
          </button>
          <button className="py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors">
            <ScanLine size={13} />
            Scan Order
          </button>
        </div>
      </div>

      {/* ── MIDDLE PANEL — Category grid ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-3 gap-2 h-full auto-rows-fr">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => addToSale(cat)}
                className="flex items-center justify-center rounded-2xl bg-white border border-gray-200 text-gray-800 font-medium text-sm hover:bg-navy hover:text-white hover:border-navy active:scale-95 transition-all shadow-sm min-h-[64px] px-2 text-center leading-tight"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Item count */}
        <div className="border-t border-gray-200 bg-white px-4 py-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-gray-400 flex items-center justify-center">
            <span className="text-sm font-bold text-gray-600">{items.length}</span>
          </div>
          <span className="text-sm text-gray-500">items</span>
          {items.length > 0 && (
            <div className="ml-2 flex gap-1.5 flex-wrap">
              {items.map((item, i) => (
                <button
                  key={i}
                  onClick={() => removeItem(i)}
                  className="text-xs bg-navy/10 text-navy px-2 py-0.5 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
                >
                  {item.category} ${item.amount.toFixed(2)} ×
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL — Current Sale ── */}
      <div className="w-72 shrink-0 bg-white border-l border-gray-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-base">Current Sale</h2>
          <button className="text-gray-400 hover:text-gray-600">
            <MoreHorizontal size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Add customer */}
          <button className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 hover:border-navy hover:text-navy transition-colors">
            <UserPlus size={16} />
            Add Customer +
          </button>

          {/* Pickup date */}
          <button className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-500 rounded-xl py-2.5 text-sm font-medium hover:bg-red-100 transition-colors">
            Pick up: {PICKUP_DATE}
            <ChevronDown size={14} />
          </button>

          {/* Items list */}
          {items.length > 0 && (
            <div className="space-y-1">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                  <span className="text-sm text-gray-700">{item.category}</span>
                  <span className="text-sm font-semibold text-gray-900">${item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals + payment */}
        <div className="border-t border-gray-100">
          <div className="px-4 py-3 space-y-1.5 bg-gray-50">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900">
              <span>Total <span className="text-xs font-normal text-gray-400">(incl 10% GST)</span></span>
              <span className="text-lg">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3">
            <button
              disabled={!total}
              className="py-3.5 rounded-xl bg-gray-200 hover:bg-gray-300 disabled:opacity-40 text-gray-700 font-semibold text-sm transition-colors"
            >
              Cash ${total.toFixed(2)}
            </button>
            <button
              disabled={!total}
              className="py-3.5 rounded-xl bg-navy hover:bg-navy-light disabled:opacity-40 text-white font-semibold text-sm transition-colors"
            >
              Card ${total.toFixed(2)}
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
