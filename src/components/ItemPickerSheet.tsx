import { useState } from 'react'
import { Search, X, ChevronRight, ArrowLeft } from 'lucide-react'

export interface PriceItem {
  id: string
  name: string
  price: number
  subCategory: string
}

export interface Category {
  id: string
  name: string
  items: PriceItem[]
}

// Mock data matching SmartPOS — will be replaced with Firestore data
export const MOCK_CATEGORIES: Category[] = [
  {
    id: 'wedding', name: 'Wedding',
    items: [
      { id: 'w1', name: 'Hem', price: 85, subCategory: 'Dress' },
      { id: 'w2', name: 'Take In', price: 120, subCategory: 'Dress' },
      { id: 'w3', name: 'Let Out', price: 110, subCategory: 'Dress' },
      { id: 'w4', name: 'Bustle', price: 65, subCategory: 'Dress' },
      { id: 'w5', name: 'Zip Replacement', price: 75, subCategory: 'Dress' },
      { id: 'w6', name: 'Hem', price: 45, subCategory: 'Veil' },
      { id: 'w7', name: 'Shorten Straps', price: 55, subCategory: 'Dress' },
    ]
  },
  {
    id: 'blazer', name: 'Blazer',
    items: [
      { id: 'b1', name: 'Shorten Sleeves', price: 55, subCategory: 'Sleeves' },
      { id: 'b2', name: 'Take In', price: 65, subCategory: 'Body' },
      { id: 'b3', name: 'Shorten Body', price: 45, subCategory: 'Body' },
      { id: 'b4', name: 'Shorten Sleeves (with buttons)', price: 75, subCategory: 'Sleeves' },
    ]
  },
  {
    id: 'dress', name: 'Dress',
    items: [
      { id: 'd1', name: 'Hem', price: 45, subCategory: 'Hem' },
      { id: 'd2', name: 'Take In', price: 65, subCategory: 'Body' },
      { id: 'd3', name: 'Let Out', price: 55, subCategory: 'Body' },
      { id: 'd4', name: 'Zip Replacement', price: 45, subCategory: 'Repairs' },
      { id: 'd5', name: 'Shorten Straps', price: 35, subCategory: 'Alterations' },
      { id: 'd6', name: 'Lining Repair', price: 40, subCategory: 'Repairs' },
    ]
  },
  {
    id: 'pant', name: 'Pant',
    items: [
      { id: 'p1', name: 'Hem', price: 20, subCategory: 'Hem' },
      { id: 'p2', name: 'Hem (cuff)', price: 25, subCategory: 'Hem' },
      { id: 'p3', name: 'Waist In', price: 35, subCategory: 'Waist' },
      { id: 'p4', name: 'Waist Out', price: 30, subCategory: 'Waist' },
      { id: 'p5', name: 'Taper Legs', price: 45, subCategory: 'Legs' },
      { id: 'p6', name: 'Shorten Legs', price: 20, subCategory: 'Hem' },
      { id: 'p7', name: 'Zipper Replacement', price: 35, subCategory: 'Repairs' },
    ]
  },
  {
    id: 'shirt', name: 'Shirt',
    items: [
      { id: 's1', name: 'Shorten Sleeves', price: 30, subCategory: 'Sleeves' },
      { id: 's2', name: 'Take In', price: 40, subCategory: 'Body' },
      { id: 's3', name: 'Shorten Body', price: 35, subCategory: 'Body' },
    ]
  },
  {
    id: 'skirt', name: 'Skirt',
    items: [
      { id: 'sk1', name: 'Hem', price: 30, subCategory: 'Hem' },
      { id: 'sk2', name: 'Take In', price: 45, subCategory: 'Body' },
      { id: 'sk3', name: 'Zip Replacement', price: 40, subCategory: 'Repairs' },
    ]
  },
  {
    id: 'trouser', name: 'Trouser',
    items: [
      { id: 't1', name: 'Hem', price: 22, subCategory: 'Hem' },
      { id: 't2', name: 'Waist In', price: 38, subCategory: 'Waist' },
      { id: 't3', name: 'Taper', price: 50, subCategory: 'Legs' },
      { id: 't4', name: 'Shorten Legs', price: 22, subCategory: 'Hem' },
    ]
  },
  {
    id: 'blouse', name: 'Blouse',
    items: [
      { id: 'bl1', name: 'Take In', price: 40, subCategory: 'Body' },
      { id: 'bl2', name: 'Shorten', price: 35, subCategory: 'Body' },
      { id: 'bl3', name: 'Shorten Sleeves', price: 30, subCategory: 'Sleeves' },
    ]
  },
  {
    id: 'repair', name: 'Repair',
    items: [
      { id: 'r1', name: 'Zip Replacement', price: 35, subCategory: 'Zips' },
      { id: 'r2', name: 'Button Replacement', price: 15, subCategory: 'Buttons' },
      { id: 'r3', name: 'Seam Repair', price: 25, subCategory: 'Seams' },
      { id: 'r4', name: 'Lining Repair', price: 40, subCategory: 'Lining' },
      { id: 'r5', name: 'Elastic Replacement', price: 30, subCategory: 'Elastic' },
    ]
  },
  {
    id: 'misc', name: 'Miscellaneous',
    items: [
      { id: 'm1', name: 'Custom Alteration', price: 0, subCategory: 'Custom' },
      { id: 'm2', name: 'Consultation', price: 20, subCategory: 'Custom' },
    ]
  },
]

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelectItem: (category: string, item: PriceItem) => void
  categoryCount: Record<string, number> // how many items already added per category
}

export default function ItemPickerSheet({ isOpen, onClose, onSelectItem, categoryCount }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  if (!isOpen) return null

  const subCategories = selectedCategory
    ? [...new Set(selectedCategory.items.map(i => i.subCategory))]
    : []

  const filteredItems = selectedCategory?.items.filter(i => {
    const matchSub = !selectedSubCategory || i.subCategory === selectedSubCategory
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase())
    return matchSub && matchSearch
  }) ?? []

  function handleSelectItem(item: PriceItem) {
    if (!selectedCategory) return
    const existing = categoryCount[selectedCategory.name] ?? 0
    const label = existing > 0 ? `${selectedCategory.name} ${existing + 1}` : selectedCategory.name
    onSelectItem(label, item)
    onClose()
    setSelectedCategory(null)
    setSelectedSubCategory(null)
    setSearch('')
  }

  function handleBack() {
    if (selectedSubCategory) {
      setSelectedSubCategory(null)
    } else {
      setSelectedCategory(null)
    }
    setSearch('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          {selectedCategory ? (
            <button onClick={handleBack} className="text-navy hover:text-navy-light">
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div className="w-5" />
          )}
          <h2 className="flex-1 font-semibold text-gray-900 text-base">
            {!selectedCategory && 'Select Category'}
            {selectedCategory && !selectedSubCategory && selectedCategory.name}
            {selectedCategory && selectedSubCategory && `${selectedCategory.name} › ${selectedSubCategory}`}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Search (when category selected) */}
        {selectedCategory && (
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Category list */}
          {!selectedCategory && (
            <div className="p-3 grid grid-cols-3 gap-2">
              {MOCK_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat); setSearch('') }}
                  className="flex flex-col items-center justify-center rounded-xl bg-gray-50 border border-gray-200 hover:bg-navy hover:text-white hover:border-navy transition-all p-3 min-h-[72px] text-center"
                >
                  <span className="text-sm font-semibold leading-tight">{cat.name}</span>
                  <span className="text-xs text-gray-400 mt-0.5 group-hover:text-white/70">
                    {cat.items.length} items
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Subcategory list */}
          {selectedCategory && !selectedSubCategory && !search && (
            <div className="py-2">
              {subCategories.map(sub => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubCategory(sub)}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                >
                  <span className="font-medium text-gray-800">{sub}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {selectedCategory.items.filter(i => i.subCategory === sub).length} items
                    </span>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Items list */}
          {selectedCategory && (selectedSubCategory || search) && (
            <div className="py-2">
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-navy/5 transition-colors border-b border-gray-50 last:border-0"
                >
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.subCategory}</p>
                  </div>
                  <span className="font-bold text-navy text-base">
                    {item.price > 0 ? `$${item.price.toFixed(2)}` : 'Custom'}
                  </span>
                </button>
              ))}
              {filteredItems.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">No items found</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
