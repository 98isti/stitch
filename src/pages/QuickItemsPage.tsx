import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { useItems } from '../hooks/useItems'
import { X, Plus, Search } from 'lucide-react'

interface QuickItem {
  itemId: string
  name: string
  price: number
  category: string
}

const MAX_QUICK_ITEMS = 8

export default function QuickItemsPage() {
  const navigate = useNavigate()
  const { accountId } = useAuth()
  const { activeLocation } = useLocations(accountId)
  const { items } = useItems(accountId, activeLocation?.id ?? null)

  const [quickItems, setQuickItems] = useState<QuickItem[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [search, setSearch] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  // Load quick items from location doc
  useEffect(() => {
    if (!accountId || !activeLocation) return
    getDoc(doc(db, 'accounts', accountId, 'locations', activeLocation.id)).then(snap => {
      if (snap.exists()) setQuickItems(snap.data().quickItems ?? [])
    })
  }, [accountId, activeLocation?.id])

  async function save(updated: QuickItem[]) {
    if (!accountId || !activeLocation) return
    setSaving(true)
    await updateDoc(doc(db, 'accounts', accountId, 'locations', activeLocation.id), {
      quickItems: updated
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function addQuickItem(item: { id: string; itemName: string; itemPrice: number; itemCategoryName: string }) {
    if (quickItems.length >= MAX_QUICK_ITEMS) return
    if (quickItems.some(q => q.itemId === item.id)) return
    const updated = [...quickItems, {
      itemId: item.id,
      name: item.itemName,
      price: item.itemPrice,
      category: item.itemCategoryName,
    }]
    setQuickItems(updated)
    save(updated)
    setShowPicker(false)
    setSearch('')
  }

  function removeQuickItem(itemId: string) {
    const updated = quickItems.filter(q => q.itemId !== itemId)
    setQuickItems(updated)
    save(updated)
  }

  // Filter items for picker
  const filteredItems = items
    .filter(i => i.itemPrice > 0)
    .filter(i => !search || i.itemName.toLowerCase().includes(search.toLowerCase()) || i.itemCategoryName.toLowerCase().includes(search.toLowerCase()))
    .filter(i => !quickItems.some(q => q.itemId === i.id))
    .sort((a, b) => a.itemCategoryName.localeCompare(b.itemCategoryName) || a.itemName.localeCompare(b.itemName))

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-navy font-medium text-sm">← Back</button>
        <h1 className="flex-1 text-center font-bold text-navy text-base">Quick Items</h1>
        {saved
          ? <span className="text-green-500 text-sm font-medium">Saved ✓</span>
          : saving
            ? <span className="text-gray-400 text-sm">Saving…</span>
            : <span className="w-12" />
        }
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        <p className="text-sm text-gray-500">
          Add up to {MAX_QUICK_ITEMS} items that appear as quick-tap buttons on the POS screen.
          Tap a quick item to add it to the sale instantly.
        </p>

        {/* Current quick items */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {quickItems.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No quick items yet. Add some below.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {quickItems.map((qi, i) => (
                <div key={qi.itemId} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-5 h-5 rounded-full bg-navy/10 text-navy text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{qi.name}</p>
                    <p className="text-xs text-gray-400">{qi.category} · ${qi.price.toFixed(2)}</p>
                  </div>
                  <button onClick={() => removeQuickItem(qi.itemId)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add button */}
        {quickItems.length < MAX_QUICK_ITEMS && (
          <button onClick={() => setShowPicker(true)}
            className="w-full flex items-center justify-center gap-2 bg-navy text-white py-3 rounded-2xl font-semibold text-sm hover:bg-navy/90 transition-colors">
            <Plus size={16} /> Add Quick Item ({quickItems.length}/{MAX_QUICK_ITEMS})
          </button>
        )}
        {quickItems.length >= MAX_QUICK_ITEMS && (
          <p className="text-center text-xs text-gray-400">Maximum {MAX_QUICK_ITEMS} quick items reached. Remove one to add another.</p>
        )}

      </div>

      {/* Item picker sheet */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setShowPicker(false); setSearch('') }} />
          <div className="relative w-full bg-white rounded-t-2xl shadow-2xl max-w-lg mx-auto flex flex-col max-h-[80vh]">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-4 mb-3 shrink-0" />
            <div className="px-4 pb-3 shrink-0">
              <h2 className="font-bold text-navy text-lg mb-3">Choose Item</h2>
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
                <Search size={14} className="text-gray-400 shrink-0" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search items…"
                  className="flex-1 bg-transparent text-sm focus:outline-none text-gray-700 placeholder-gray-400"
                  autoFocus
                />
                {search && <button onClick={() => setSearch('')} className="text-gray-400"><X size={14} /></button>}
              </div>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100 px-4 pb-6">
              {filteredItems.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No items found</p>
              ) : filteredItems.map(item => (
                <button key={item.id} onClick={() => addQuickItem(item)}
                  className="w-full flex items-center justify-between py-3 hover:bg-gray-50 transition-colors text-left">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.itemName}</p>
                    <p className="text-xs text-gray-400">{item.itemCategoryName}</p>
                  </div>
                  <span className="text-sm font-semibold text-navy">${item.itemPrice.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
