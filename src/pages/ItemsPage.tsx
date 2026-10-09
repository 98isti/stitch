import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useCategories } from '../hooks/useCategories'
import { Plus, Pencil, Trash2, ChevronLeft } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

interface Item { id: string; itemName: string; itemCategoryName: string; itemSubCategoryName: string; itemPrice: number }

interface FormState { itemName: string; itemCategoryName: string; itemSubCategoryName: string; itemPrice: string }
const EMPTY: FormState = { itemName: '', itemCategoryName: '', itemSubCategoryName: '', itemPrice: '' }

export default function ItemsPage() {
  const { accountId } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initCat = params.get('category') ?? ''

  const { categories } = useCategories(accountId)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCat, setFilterCat] = useState(initCat)
  const [showSheet, setShowSheet] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)
  const [form, setForm] = useState<FormState>({ ...EMPTY, itemCategoryName: initCat })
  const [saving, setSaving] = useState(false)

  async function fetchItems() {
    if (!accountId) return
    setLoading(true)
    const snap = await getDocs(query(collection(db, 'accounts', accountId, 'items'), orderBy('itemCategoryName')))
    setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as Item)))
    setLoading(false)
  }
  useEffect(() => { fetchItems() }, [accountId])

  const filtered = filterCat ? items.filter(i => i.itemCategoryName === filterCat) : items

  function openAdd() {
    setEditing(null)
    setForm({ ...EMPTY, itemCategoryName: filterCat })
    setShowSheet(true)
  }
  function openEdit(item: Item) {
    setEditing(item)
    setForm({ itemName: item.itemName, itemCategoryName: item.itemCategoryName, itemSubCategoryName: item.itemSubCategoryName, itemPrice: String(item.itemPrice) })
    setShowSheet(true)
  }

  async function handleSave() {
    if (!accountId || !form.itemName.trim()) return
    setSaving(true)
    try {
      const data = {
        itemName: form.itemName.trim(),
        itemCategoryName: form.itemCategoryName,
        itemSubCategoryName: form.itemSubCategoryName,
        itemPrice: parseFloat(form.itemPrice) || 0,
      }
      if (editing) {
        await updateDoc(doc(db, 'accounts', accountId, 'items', editing.id), { ...data, updatedAt: serverTimestamp() })
      } else {
        await addDoc(collection(db, 'accounts', accountId, 'items'), { ...data, createdAt: serverTimestamp() })
      }
      setShowSheet(false)
      fetchItems()
    } finally { setSaving(false) }
  }

  async function handleDelete(item: Item) {
    if (!accountId || !confirm(`Delete "${item.itemName}"?`)) return
    await deleteDoc(doc(db, 'accounts', accountId, 'items', item.id))
    setItems(prev => prev.filter(x => x.id !== item.id))
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <button onClick={() => navigate('/categories')} className="flex items-center gap-1 text-navy text-sm font-medium"><ChevronLeft size={18} /> Categories</button>
        <h1 className="font-bold text-gray-900">Price List</h1>
        <button onClick={openAdd} className="flex items-center gap-1 text-navy text-sm font-medium"><Plus size={16} /> Add</button>
      </div>

      {/* Category filter */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto shrink-0">
        <button onClick={() => setFilterCat('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${!filterCat ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600'}`}>
          All
        </button>
        {categories.map(c => (
          <button key={c.id} onClick={() => setFilterCat(c.categoryName)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterCat === c.categoryName ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600'}`}>
            {c.categoryName}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-3">🏷️</p><p className="text-sm">No items yet</p></div>
        ) : filtered.map(item => (
          <div key={item.id} className="bg-white rounded-xl px-4 py-3 border border-gray-100 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate">{item.itemName}</p>
              <p className="text-xs text-gray-400">{item.itemCategoryName}{item.itemSubCategoryName ? ' › ' + item.itemSubCategoryName : ''}</p>
            </div>
            <p className="font-bold text-gray-900 shrink-0">${item.itemPrice.toFixed(2)}</p>
            <button onClick={() => openEdit(item)} className="p-2 text-gray-400 hover:text-navy"><Pencil size={14} /></button>
            <button onClick={() => handleDelete(item)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>

      {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowSheet(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative z-10 bg-white rounded-t-3xl w-full max-w-sm pb-10 pt-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="text-center font-bold text-gray-900 mb-4 px-4">{editing ? 'Edit Item' : 'New Item'}</h3>
            <div className="px-6 space-y-3">
              <input value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))}
                placeholder="Item name *"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-navy" />
              <select value={form.itemCategoryName} onChange={e => setForm(f => ({ ...f, itemCategoryName: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-navy bg-white">
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.categoryName}>{c.categoryName}</option>)}
              </select>
              <input value={form.itemSubCategoryName} onChange={e => setForm(f => ({ ...f, itemSubCategoryName: e.target.value }))}
                placeholder="Sub-category (optional)"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-navy" />
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" step="0.01" min="0" value={form.itemPrice}
                  onChange={e => setForm(f => ({ ...f, itemPrice: e.target.value }))}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:border-navy" />
              </div>
              <button onClick={handleSave} disabled={!form.itemName.trim() || saving}
                className="w-full py-3.5 rounded-xl bg-navy text-white font-semibold text-sm disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
