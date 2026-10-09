import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { Plus, Pencil, Trash2, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Category { id: string; categoryName: string }

export default function CategoriesPage() {
  const { accountId } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showSheet, setShowSheet] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function fetchCats() {
    if (!accountId) return
    setLoading(true)
    const snap = await getDocs(query(collection(db, 'accounts', accountId, 'categories'), orderBy('categoryName')))
    setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)))
    setLoading(false)
  }
  useEffect(() => { fetchCats() }, [accountId])

  function openAdd() { setEditing(null); setName(''); setShowSheet(true) }
  function openEdit(c: Category) { setEditing(c); setName(c.categoryName); setShowSheet(true) }

  async function handleSave() {
    if (!accountId || !name.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await updateDoc(doc(db, 'accounts', accountId, 'categories', editing.id), { categoryName: name.trim(), updatedAt: serverTimestamp() })
      } else {
        await addDoc(collection(db, 'accounts', accountId, 'categories'), { categoryName: name.trim(), createdAt: serverTimestamp() })
      }
      setShowSheet(false)
      fetchCats()
    } finally { setSaving(false) }
  }

  async function handleDelete(c: Category) {
    if (!accountId || !confirm(`Delete category "${c.categoryName}"?`)) return
    await deleteDoc(doc(db, 'accounts', accountId, 'categories', c.id))
    setCategories(prev => prev.filter(x => x.id !== c.id))
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <button onClick={() => navigate('/pos')} className="flex items-center gap-1 text-navy text-sm font-medium"><ChevronLeft size={18} /> Back</button>
        <h1 className="font-bold text-gray-900">Categories</h1>
        <button onClick={openAdd} className="flex items-center gap-1 text-navy text-sm font-medium"><Plus size={16} /> Add</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" /></div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-3">📂</p><p className="text-sm">No categories yet</p></div>
        ) : categories.map(c => (
          <div key={c.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center text-navy text-sm shrink-0">📂</div>
            <p className="flex-1 font-semibold text-gray-900 text-sm">{c.categoryName}</p>
            <button onClick={() => navigate(`/items?category=${encodeURIComponent(c.categoryName)}`)}
              className="text-xs text-navy font-medium hover:underline mr-2">Items</button>
            <button onClick={() => openEdit(c)} className="p-2 text-gray-400 hover:text-navy rounded-lg"><Pencil size={14} /></button>
            <button onClick={() => handleDelete(c)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>

      {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowSheet(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative z-10 bg-white rounded-t-3xl w-full max-w-sm pb-10 pt-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="text-center font-bold text-gray-900 text-base mb-4 px-4">{editing ? 'Edit Category' : 'New Category'}</h3>
            <div className="px-6 space-y-3">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Category name"
                autoFocus onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy" />
              <button onClick={handleSave} disabled={!name.trim() || saving}
                className="w-full py-3.5 rounded-xl bg-navy text-white font-semibold text-sm disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
