import { useState, useEffect } from 'react'
import { Search, X, ChevronRight, ArrowLeft, Loader } from 'lucide-react'
import type { PriceItem } from '../hooks/useItems'
import type { Category } from '../hooks/useCategories'

export type { PriceItem }

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelectItem: (categoryLabel: string, item: PriceItem) => void
  categoryCount: Record<string, number>
  categories: Category[]
  getItemsForCategory: (cat: string) => PriceItem[]
  getSubCategories: (cat: string) => string[]
  loading: boolean
  initialCategory?: string | null
}

export default function ItemPickerSheet({
  isOpen, onClose, onSelectItem, categoryCount,
  categories, getItemsForCategory, getSubCategories, loading, initialCategory
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Auto-select category when opened from a category button
  useEffect(() => {
    if (isOpen && initialCategory) {
      const cat = categories.find(c => c.categoryName === initialCategory)
      if (cat) setSelectedCategory(cat)
    }
    if (!isOpen) {
      setSelectedCategory(null)
      setSelectedSubCategory(null)
      setSearch('')
    }
  }, [isOpen, initialCategory, categories])

  if (!isOpen) return null

  const subCategories = selectedCategory ? getSubCategories(selectedCategory.categoryName) : []

  const categoryItems = selectedCategory ? getItemsForCategory(selectedCategory.categoryName) : []

  const filteredItems = categoryItems.filter(i => {
    const matchSub = !selectedSubCategory || i.itemSubCategoryName === selectedSubCategory
    const matchSearch = !search || i.itemName.toLowerCase().includes(search.toLowerCase())
    return matchSub && matchSearch
  })

  function handleSelectItem(item: PriceItem) {
    if (!selectedCategory) return
    const base = selectedCategory.categoryName
    const existing = categoryCount[base] ?? 0
    const label = existing > 0 ? `${base} ${existing + 1}` : base
    onSelectItem(label, item)
    onClose()
    reset()
  }

  function reset() {
    setSelectedCategory(null)
    setSelectedSubCategory(null)
    setSearch('')
  }

  function handleBack() {
    if (selectedSubCategory) setSelectedSubCategory(null)
    else setSelectedCategory(null)
    setSearch('')
  }

  function handleClose() {
    onClose()
    reset()
  }

  // Title
  let title = 'Select Category'
  if (selectedCategory && !selectedSubCategory) title = selectedCategory.categoryName
  if (selectedCategory && selectedSubCategory) title = `${selectedCategory.categoryName} › ${selectedSubCategory}`

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      <div className="relative z-10 w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          {selectedCategory
            ? <button onClick={handleBack} className="text-navy hover:text-navy-light"><ArrowLeft size={20} /></button>
            : <div className="w-5" />
          }
          <h2 className="flex-1 font-semibold text-gray-900 text-base">{title}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Search */}
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
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader size={20} className="animate-spin mr-2" /> Loading...
            </div>
          )}

          {/* Category grid */}
          {!loading && !selectedCategory && (
            <div className="p-3 grid grid-cols-3 gap-2">
              {categories.map(cat => {
                const itemCount = getItemsForCategory(cat.categoryName).length
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat); setSearch('') }}
                    className="flex flex-col items-center justify-center rounded-xl bg-gray-50 border border-gray-200 hover:bg-navy hover:text-white hover:border-navy transition-all p-3 min-h-[72px] text-center group"
                  >
                    <span className="text-sm font-semibold leading-tight">{cat.categoryName}</span>
                    <span className="text-xs text-gray-400 group-hover:text-white/70 mt-0.5">{itemCount} items</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Subcategory list */}
          {!loading && selectedCategory && !selectedSubCategory && !search && (
            <div className="py-1">
              {subCategories.length > 0
                ? subCategories.map(sub => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubCategory(sub)}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <span className="font-medium text-gray-800">{sub}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {categoryItems.filter(i => i.itemSubCategoryName === sub).length} items
                      </span>
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  </button>
                ))
                : filteredItems.map(item => (
                  <button key={item.id} onClick={() => handleSelectItem(item)}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-navy/5 transition-colors border-b border-gray-50 last:border-0">
                    <p className="font-medium text-gray-900 text-left">{item.itemName}</p>
                    <span className="font-bold text-navy ml-3 shrink-0">
                      {item.itemPrice > 0 ? `$${item.itemPrice.toFixed(2)}` : 'Custom'}
                    </span>
                  </button>
                ))
              }
            </div>
          )}

          {/* Items list */}
          {!loading && selectedCategory && (selectedSubCategory || search) && (
            <div className="py-1">
              {filteredItems.length > 0
                ? filteredItems.map(item => (
                  <button key={item.id} onClick={() => handleSelectItem(item)}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-navy/5 transition-colors border-b border-gray-50 last:border-0">
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{item.itemName}</p>
                      {item.itemSubCategoryName && (
                        <p className="text-xs text-gray-400 mt-0.5">{item.itemSubCategoryName}</p>
                      )}
                    </div>
                    <span className="font-bold text-navy ml-3 shrink-0 text-base">
                      {item.itemPrice > 0 ? `$${item.itemPrice.toFixed(2)}` : 'Custom'}
                    </span>
                  </button>
                ))
                : <div className="text-center py-8 text-gray-400 text-sm">No items found</div>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
