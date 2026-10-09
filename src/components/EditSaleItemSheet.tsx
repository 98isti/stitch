import { useState, useEffect } from 'react'
import { Minus, Plus } from 'lucide-react'

import type { SaleItem } from '../types/sale'

interface Props {
  item: SaleItem | null
  onClose: () => void
  onSave: (updated: SaleItem) => void
}

export default function EditSaleItemSheet({ item, onClose, onSave }: Props) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [note, setNote] = useState('')
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (item) {
      setName(item.name)
      setPrice(item.unitPrice.toString())
      setNote(item.note)
      setQuantity(item.quantity)
    }
  }, [item])

  if (!item) return null

  const unitPrice = parseFloat(price) || 0
  const lineTotal = unitPrice * quantity

  function handleSave() {
    if (!item) return
    onSave({ id: item.id, garmentId: item.garmentId, category: item.category, name, unitPrice, note, quantity })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button onClick={onClose}
            className="text-navy font-medium text-sm hover:opacity-70 transition-opacity">
            Cancel
          </button>
          <h2 className="font-semibold text-gray-900 text-base">{item.category}</h2>
          <button onClick={handleSave}
            className="bg-navy text-white text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-navy-light transition-colors">
            Save
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Item Name:</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
            />
          </div>

          {/* Item Price */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Item Price:</label>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus-within:ring-2 focus-within:ring-navy/20 focus-within:border-navy">
              <span className="text-gray-500 font-medium">$</span>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="flex-1 bg-transparent text-gray-900 text-base focus:outline-none"
                inputMode="decimal"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Note:</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Tap to add note"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy placeholder-gray-300"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-3">Quantity</label>
            <div className="flex items-center gap-5">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 active:scale-95 transition-all flex items-center justify-center">
                <Minus size={18} className="text-gray-600" />
              </button>
              <span className="text-2xl font-bold text-gray-900 w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(q => q + 1)}
                className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 active:scale-95 transition-all flex items-center justify-center">
                <Plus size={18} className="text-gray-600" />
              </button>
              <span className="text-sm text-gray-500 ml-2">
                (Total: ${lineTotal.toFixed(2)})
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
