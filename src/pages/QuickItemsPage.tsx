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

  // Picker state: null = closed, '' = category list, 'CategoryName' = items in category
  const [pickerCategory, setPickerCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!accountId || !activeLocation) return
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
    const updated = [...quickItems, { itemId: item.id, name: item.itemName, price: item.itemPrice, category: item.itemCategoryName }]
    setQuickItems(updated)
    save(updated)
    setPickerCategory(null)
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

  // Items in selected category (for picker)
  const pickerItems = items
    .filter(i => i.itemCategoryName === pickerCategory && i.itemPrice > 0)
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
                  {/* Up/down */}
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => move(i, -1)} disabled={i === 0}
                      className="p-0.5 text-gray-300 hover:text-navy disabled:opacity-20 transition-colors">
                      <ChevronUp size={16} />
                    </button>
                    <button onClick={() => move(i, 1)} disabled={i === quickItems.length - 1}
                      className="p-0.5 text-gray-300 hover:text-navy disabled:opacity-20 transition-colors">
                      <ChevronDown size={16} />
                    </button>
                  </div>
                  {/* Number */}
                  <span className="w-5 h-5 rounded-full bg-navy/10 text-navy text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  {/* Name + category */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{qi.name}</p>
                    <p className="text-xs text-gray-400">{qi.category} · ${qi.price.toFixed(2)}</p>
                  </div>
                  {/* Remove */}
                  <button onClick={() => remove(qi.itemId)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1">
                    <X size={15} />
                  </button>
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
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setPickerCategory(null); setSearch('') }} />
          <div className="relative w-full bg-white rounded-t-2xl shadow-2xl max-w-lg mx-auto flex flex-col max-h-[85vh]">

            {/* Sheet header */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-4 mb-3 shrink-0" />
            <div className="px-4 pb-3 shrink-0 space-y-3">
              <div className="flex items-center gap-2">
                {pickerCategory !== '' && (
                  <button onClick={() => { setPickerCategory(''); setSearch('') }}
                    className="text-navy p-1">
                    <ArrowLeft size={18} />
                  </button>
                )}
                <h2 className="font-bold text-navy text-base flex-1">
                  {pickerCategory !== '' ? pickerCategory : 'Choose Category'}
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
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.itemName}</p>
                        <p className="text-xs text-gray-400">{item.itemCategoryName}</p>
                      </div>
                      <span className="text-sm font-semibold text-navy">${item.itemPrice.toFixed(2)}</span>
                    </button>
                  ))

              ) : pickerCategory === '' ? (
                /* Category list */
                categories.map(cat => (
                  <button key={cat.id} onClick={() => setPickerCategory(cat.categoryName)}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors text-left">
                    <span className="text-sm font-medium text-gray-800">{cat.categoryName}</span>
                    <ChevronRight size={16} className="text-gray-300" />
                  </button>
                ))

              ) : (
                /* Items in category */
                pickerItems.length === 0
                  ? <p className="text-center text-sm text-gray-400 py-8">All items from this category already added</p>
                  : pickerItems.map(item => (
                    <button key={item.id} onClick={() => addItem(item)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                      <span className="text-sm font-medium text-gray-800">{item.itemName}</span>
                      <span className="text-sm font-semibold text-navy">${item.itemPrice.toFixed(2)}</span>
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
