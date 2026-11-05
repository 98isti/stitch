import { useState, useEffect } from 'react'
import { Minus, Plus } from 'lucide-react'
import type { SaleItem } from '../types/sale'
import { useExtras } from '../hooks/useExtras'

const COLOURS: { name: string; bg: string; text: string; border: string }[] = [
  { name: 'White',  bg: 'bg-white',       text: 'text-gray-800', border: 'border-gray-300' },
  { name: 'Black',  bg: 'bg-gray-900',    text: 'text-white',    border: 'border-gray-900' },
  { name: 'Blue',   bg: 'bg-blue-500',    text: 'text-white',    border: 'border-blue-500' },
  { name: 'Beige',  bg: 'bg-amber-100',   text: 'text-gray-800', border: 'border-amber-200' },
  { name: 'Grey',   bg: 'bg-gray-400',    text: 'text-white',    border: 'border-gray-400' },
  { name: 'Green',  bg: 'bg-green-600',   text: 'text-white',    border: 'border-green-600' },
  { name: 'Olive',  bg: 'bg-yellow-800',  text: 'text-white',    border: 'border-yellow-800' },
  { name: 'Brown',  bg: 'bg-amber-800',   text: 'text-white',    border: 'border-amber-800' },
  { name: 'Pink',   bg: 'bg-pink-400',    text: 'text-white',    border: 'border-pink-400' },
  { name: 'Red',    bg: 'bg-red-500',     text: 'text-white',    border: 'border-red-500' },
]

const FABRICS = [
  { name: 'Cotton', price: 0 },
  { name: 'Linen', price: 2 },
  { name: 'Linen blend', price: 0 },
  { name: 'Wool', price: 2 },
  { name: 'Polyester', price: 0 },
  { name: 'Silk', price: 2 },
  { name: 'Satin', price: 0 },
  { name: 'Suede', price: 0 },
  { name: 'Leather trim', price: 8 },
  { name: 'Cashmere', price: 3 },
  { name: 'Not sure', price: 0 },
]

const STAINS = ['Food', 'Coffee', 'Oil / grease', 'Sweat', 'Blood', 'Ink', 'Mould', 'Bleach mark', 'Other']
const STAIN_PRICE = 2

type OptionsTab = 'extras' | 'colour' | 'fabric' | 'stain'

interface Props {
  item: SaleItem | null
  accountId: string | null
  onClose: () => void
  onSave: (updated: SaleItem) => void
}

export default function EditSaleItemSheet({ item, accountId, onClose, onSave }: Props) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [note, setNote] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [selectedExtras, setSelectedExtras] = useState<{ name: string; price: number }[]>([])
  const [selectedColour, setSelectedColour] = useState<string | undefined>(undefined)
  const [selectedFabric, setSelectedFabric] = useState<{ name: string; price: number } | undefined>(undefined)
  const [selectedStains, setSelectedStains] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<OptionsTab | null>(null)

  const availableExtras = useExtras(accountId)

  useEffect(() => {
    if (item) {
      setName(item.name)
      setPrice(item.unitPrice.toString())
      setNote(item.note)
      setQuantity(item.quantity)
      setSelectedExtras(item.extras ?? [])
      setSelectedColour(item.colour)
      setSelectedFabric(item.fabric)
      setSelectedStains(item.stains ?? [])
    }
  }, [item])

  if (!item) return null

  const unitPrice = parseFloat(price) || 0
  const extrasTotal = selectedExtras.reduce((s, e) => s + e.price, 0)
  const fabricPrice = selectedFabric?.price ?? 0
  const stainsTotal = selectedStains.length * STAIN_PRICE
  const lineTotal = (unitPrice + extrasTotal + fabricPrice + stainsTotal) * quantity

  function toggleExtra(extra: { name: string; price: number }) {
    setSelectedExtras(prev =>
      prev.some(e => e.name === extra.name)
        ? prev.filter(e => e.name !== extra.name)
        : [...prev, extra]
    )
  }

  function toggleStain(stain: string) {
    setSelectedStains(prev =>
      prev.includes(stain) ? prev.filter(s => s !== stain) : [...prev, stain]
    )
  }

  function handleSave() {
    if (!item) return
    onSave({
      id: item.id,
      garmentId: item.garmentId,
      category: item.category,
      name,
      unitPrice,
      note,
      quantity,
      components: item.components,
      extras: selectedExtras.length > 0 ? selectedExtras : undefined,
      colour: selectedColour,
      fabric: selectedFabric,
      stains: selectedStains.length > 0 ? selectedStains : undefined,
    })
    onClose()
  }

  const tabs: { key: OptionsTab; label: string; hasDot: boolean }[] = [
    { key: 'extras', label: 'Extras', hasDot: selectedExtras.length > 0 },
    { key: 'colour', label: 'Colour', hasDot: !!selectedColour },
    { key: 'fabric', label: 'Fabric', hasDot: !!selectedFabric },
    { key: 'stain', label: 'Stain', hasDot: selectedStains.length > 0 },
  ]

  function toggleTab(key: OptionsTab) {
    setActiveTab(prev => prev === key ? null : key)
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
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy" />
          </div>

          {/* Item Price */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Item Price:</label>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus-within:ring-2 focus-within:ring-navy/20 focus-within:border-navy">
              <span className="text-gray-500 font-medium">$</span>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                className="flex-1 bg-transparent text-gray-900 text-base focus:outline-none"
                inputMode="decimal" />
            </div>
          </div>

          {/* Options — horizontal tab switcher inside a card */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
            {/* Tab row */}
            <div className="flex gap-0 border-b border-gray-200">
              {tabs.map((tab, i) => (
                <button
                  key={tab.key}
                  onClick={() => toggleTab(tab.key)}
                  className={`relative flex-1 py-2.5 text-sm font-semibold transition-all ${
                    i > 0 ? 'border-l border-gray-200' : ''
                  } ${
                    activeTab === tab.key
                      ? 'bg-navy text-white'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}>
                  {tab.label}
                  {tab.hasDot && (
                    <span className={`absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full ${
                      activeTab === tab.key ? 'bg-white' : 'bg-navy'
                    }`} />
                  )}
                </button>
              ))}
            </div>

            {/* Chip panel — only shown when a tab is active */}
            {activeTab !== null && (
              <div className="flex flex-wrap gap-2 p-3">

                {activeTab === 'extras' && (
                  availableExtras.length === 0
                    ? <p className="text-sm text-gray-400 py-1">No extras configured. Add them in More → Extras.</p>
                    : availableExtras.map(extra => {
                      const selected = selectedExtras.some(e => e.name === extra.name)
                      return (
                        <button key={extra.name} onClick={() => toggleExtra(extra)}
                          className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all active:scale-95 ${
                            selected
                              ? 'bg-navy border-navy text-white'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-navy/40'
                          }`}>
                          {extra.name}{extra.price > 0 ? ` +$${extra.price.toFixed(0)}` : ''}
                        </button>
                      )
                    })
                )}

                {activeTab === 'colour' && COLOURS.map(colour => {
                  const isSelected = selectedColour === colour.name
                  return (
                    <button key={colour.name}
                      onClick={() => setSelectedColour(c => c === colour.name ? undefined : colour.name)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all active:scale-95 ${
                        colour.bg
                      } ${
                        colour.text
                      } ${
                        isSelected ? 'ring-2 ring-offset-1 ring-navy border-navy' : colour.border
                      }`}>
                      {colour.name}
                    </button>
                  )
                })}

                {activeTab === 'fabric' && FABRICS.map(fabric => (
                  <button key={fabric.name}
                    onClick={() => setSelectedFabric(f => f?.name === fabric.name ? undefined : fabric)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all active:scale-95 ${
                      selectedFabric?.name === fabric.name
                        ? 'bg-navy border-navy text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-navy/40'
                    }`}>
                    {fabric.name}{fabric.price > 0 ? ` +$${fabric.price}` : ''}
                  </button>
                ))}

                {activeTab === 'stain' && STAINS.map(stain => {
                  const selected = selectedStains.includes(stain)
                  return (
                    <button key={stain} onClick={() => toggleStain(stain)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all active:scale-95 ${
                        selected
                          ? 'bg-navy border-navy text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-navy/40'
                      }`}>
                      {stain} +${STAIN_PRICE}
                    </button>
                  )
                })}

              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Note:</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              placeholder="Tap to add note"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy placeholder-gray-300" />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-3">Quantity</label>
            <div className="flex items-center gap-5">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 active:scale-95 transition-all flex items-center justify-center">
                <Minus size={18} className="text-gray-600" />
              </button>
              <span className="text-2xl font-bold text-gray-900 w-8 text-center">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)}
                className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 active:scale-95 transition-all flex items-center justify-center">
                <Plus size={18} className="text-gray-600" />
              </button>
              <span className="text-sm text-gray-500 ml-2">Total: ${lineTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
