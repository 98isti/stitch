import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { useItems } from '../hooks/useItems'
import { useCategories } from '../hooks/useCategories'
import { X, ChevronUp, ChevronDown, ChevronRight, Search, ArrowLeft } from 'lucide-react'

interface QuickItem {
  itemId: string
  name: string
  price: number
  category: string
  components?: string[]
}

const MAX = 8

export default function QuickItemsPage() {
  const navigate = useNavigate()
  const { accountId } = useAuth()
  const { activeLocation } = useLocations(accountId)
  const { items } = useItems(accountId, activeLocation?.id ?? null)
  const { categories } = useCategories(accountId, activeLocation?.shopType, activeLocation?.id)

  const [quickItems, setQuickItems] = useState<QuickItem[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Picker state: null = closed, '' = category list, 'CategoryName' = sub-cat/items in category
  const [pickerCategory, setPickerCategory] = useState<string | null>(null)
  const [pickerSubCategory, setPickerSubCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!accountId || !activeLocation) return
    setQuickItems([]) // clear while loading new location
    getDoc(doc(db, 'accounts', accountId, 'locations', activeLocation.id)).then(snap => {
      if (snap.exists()) setQuickItems(snap.data().quickItems ?? [])
    })
  }, [accountId, activeLocation?.id])

  async function save(updated: QuickItem[]) {
    if (!accountId || !activeLocation) return
    setSaving(true)
    await updateDoc(doc(db, 'accounts', accountId, 'locations', activeLocation.id), { quickItems: updated })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function addItem(item: { id: string; itemName: string; itemPrice: number; itemCategoryName: string }) {
    if (quickItems.length >= MAX || quickItems.some(q => q.itemId === item.id)) return
    const updated = [...quickItems, { itemId: item.id, name: item.itemName, price: item.itemPrice, category: item.itemCategoryName, ...(( item as any).components?.length ? { components: (item as any).components } : {}) }]
    setQuickItems(updated)
    save(updated)
    setPickerCategory(null)
    setPickerSubCategory(null)
    setSearch('')
  }

  function remove(itemId: string) {
    const updated = quickItems.filter(q => q.itemId !== itemId)
    setQuickItems(updated)
    save(updated)
  }

  function move(index: number, dir: -1 | 1) {
    const newIndex = index + dir
    if (newIndex < 0 || newIndex >= quickItems.length) return
    const updated = [...quickItems]
    ;[updated[index], updated[newIndex]] = [updated[newIndex], updated[index]]
    setQuickItems(updated)
    save(updated)
  }

  // Sub-categories for selected category
  const pickerSubCategories = pickerCategory
    ? [...new Set(items
        .filter(i => i.itemCategoryName === pickerCategory && i.itemSubCategoryName)
        .map(i => i.itemSubCategoryName!))].sort()
    : []

  // Items in selected category, optionally filtered by sub-category
  const pickerItems = items
    .filter(i => i.itemCategoryName === pickerCategory && i.itemPrice > 0)
    .filter(i => !pickerSubCategory || i.itemSubCategoryName === pickerSubCategory)
    .filter(i => !quickItems.some(q => q.itemId === i.id))
    .sort((a, b) => a.itemName.localeCompare(b.itemName))

  // Search across all items
  const searchResults = search.length > 1
    ? items
        .filter(i => i.itemPrice > 0 && !quickItems.some(q => q.itemId === i.id))
        .filter(i => i.itemName.toLowerCase().includes(search.toLowerCase()) || i.itemCategoryName.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => a.itemCategoryName.localeCompare(b.itemCategoryName) || a.itemName.localeCompare(b.itemName))
    : []

  const pickerOpen = pickerCategory !== null

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-navy font-medium text-sm">← Back</button>
        <h1 className="flex-1 text-center font-bold text-navy text-base">Quick Items</h1>
        {saved
          ? <span className="text-green-500 text-sm font-medium">Saved ✓</span>
          : saving ? <span className="text-gray-400 text-sm">Saving…</span>
          : <span className="w-12" />}
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        <p className="text-sm text-gray-500">
          Up to {MAX} items — tap to add to sale instantly from the POS screen.
        </p>

        {/* Quick items list */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {quickItems.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No quick items yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {quickItems.map((qi, i) => (
                <div key={qi.itemId} className="flex items-center gap-2 px-3 py-2.5">
                  {/* Number */}
                  <span className="w-5 h-5 rounded-full bg-navy/10 text-navy text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  {/* Name + category */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{qi.name}</p>
                    <p className="text-xs text-gray-400">{qi.category} · ${qi.price.toFixed(2)}</p>
                  </div>
                  {/* Up / Down / Remove — rounded square buttons */}
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => move(i, -1)} disabled={i === 0}
                      className="w-9 h-9 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 flex items-center justify-center disabled:opacity-25 active:scale-95 transition-all hover:bg-gray-100">
                      <ChevronUp size={16} />
                    </button>
                    <button onClick={() => move(i, 1)} disabled={i === quickItems.length - 1}
                      className="w-9 h-9 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 flex items-center justify-center disabled:opacity-25 active:scale-95 transition-all hover:bg-gray-100">
                      <ChevronDown size={16} />
                    </button>
                    <button onClick={() => remove(qi.itemId)}
                      className="w-9 h-9 rounded-xl border border-red-200 bg-red-50 text-red-500 flex items-center justify-center active:scale-95 transition-all hover:bg-red-100">
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add button */}
        {quickItems.length < MAX ? (
          <button onClick={() => setPickerCategory('')}
            className="w-full bg-navy text-white py-3 rounded-2xl font-semibold text-sm hover:bg-navy/90 transition-colors">
            + Add Quick Item ({quickItems.length}/{MAX})
          </button>
        ) : (
          <p className="text-center text-xs text-gray-400">Maximum {MAX} reached — remove one to add another.</p>
        )}

      </div>

      {/* Picker sheet */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setPickerCategory(null); setSearch('') }} />
          <div className="relative w-full bg-white rounded-2xl shadow-2xl max-w-lg mx-4 flex flex-col max-h-[85vh]">

            {/* Sheet header */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-4 mb-3 shrink-0" />
            <div className="px-4 pb-3 shrink-0 space-y-3">
              <div className="flex items-center gap-2">
                {(pickerCategory !== '' || pickerSubCategory) && (
                  <button onClick={() => {
                    if (pickerSubCategory) { setPickerSubCategory(null); setSearch('') }
                    else { setPickerCategory(''); setSearch('') }
                  }} className="text-navy p-1">
                    <ArrowLeft size={18} />
                  </button>
                )}
                <h2 className="font-bold text-navy text-base flex-1">
                  {pickerCategory === '' ? 'Choose Category'
                    : pickerSubCategory ? `${pickerCategory} › ${pickerSubCategory}`
                    : pickerCategory}
                </h2>
                <button onClick={() => { setPickerCategory(null); setSearch('') }}
                  className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>

              {/* Search bar */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
                <Search size={14} className="text-gray-400 shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search items…"
                  className="flex-1 bg-transparent text-sm focus:outline-none placeholder-gray-400" />
                {search && <button onClick={() => setSearch('')} className="text-gray-400"><X size={14} /></button>}
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100 pb-6">

              {/* Search results */}
              {search.length > 1 ? (
                searchResults.length === 0
                  ? <p className="text-center text-sm text-gray-400 py-8">No items found</p>
                  : searchResults.map(item => (
                    <button key={item.id} onClick={() => addItem(item)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          {item.itemName}{(item as any).components?.length ? ` (${(item as any).components.join(' + ')})` : ''}
                        </p>
                        <p className="text-xs text-gray-400">{item.itemCategoryName}</p>
                      </div>
                      <span className="text-sm font-semibold text-navy shrink-0">${item.itemPrice.toFixed(2)}</span>
                    </button>
                  ))

              ) : pickerCategory === '' ? (
                /* Category list */
                categories.map(cat => (
                  <button key={cat.id} onClick={() => { setPickerCategory(cat.categoryName); setPickerSubCategory(null) }}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors text-left">
                    <span className="text-sm font-medium text-gray-800">{cat.categoryName}</span>
                    <ChevronRight size={16} className="text-gray-300" />
                  </button>
                ))

              ) : pickerSubCategories.length > 1 && !pickerSubCategory ? (
                /* Sub-category list */
                pickerSubCategories.map(sub => (
                  <button key={sub} onClick={() => setPickerSubCategory(sub)}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors text-left">
                    <span className="text-sm font-medium text-gray-800">{sub}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {items.filter(i => i.itemCategoryName === pickerCategory && i.itemSubCategoryName === sub && i.itemPrice > 0).length} items
                      </span>
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  </button>
                ))

              ) : (
                /* Items list */
                pickerItems.length === 0
                  ? <p className="text-center text-sm text-gray-400 py-8">All items from this category already added</p>
                  : pickerItems.map(item => (
                    <button key={item.id} onClick={() => addItem(item)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left gap-3">
                      <span className="text-sm font-medium text-gray-800 flex-1">
                        {item.itemName}{(item as any).components?.length ? ` (${(item as any).components.join(' + ')})` : ''}
                      </span>
                      <span className="text-sm font-semibold text-navy shrink-0">${item.itemPrice.toFixed(2)}</span>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
