import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { Plus, Pencil, Trash2, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Location { id: string; name: string; streetAddress: string; suburb: string; state: string; country: string; phone: string; shopType: string; orderPrefix: string }
interface FormState { name: string; streetAddress: string; suburb: string; state: string; country: string; phone: string; shopType: string; orderPrefix: string }
const EMPTY: FormState = { name: '', streetAddress: '', suburb: '', state: '', country: 'Australia', phone: '', shopType: 'alterations', orderPrefix: '' }

export default function LocationsPage() {
  const { accountId } = useAuth()
  const navigate = useNavigate()
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [showSheet, setShowSheet] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)

  async function fetchLocs() {
    if (!accountId) return
    setLoading(true)
    const snap = await getDocs(query(collection(db, 'accounts', accountId, 'locations'), orderBy('name')))
    setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Location)))
    setLoading(false)
  }
  useEffect(() => { fetchLocs() }, [accountId])

  function openAdd() { setEditing(null); setForm(EMPTY); setShowSheet(true) }
  function openEdit(l: Location) {
    setEditing(l)
    setForm({ name: l.name, streetAddress: l.streetAddress ?? '', suburb: l.suburb ?? '', state: l.state ?? '', country: l.country ?? 'Australia', phone: l.phone ?? '', shopType: l.shopType ?? 'alterations', orderPrefix: l.orderPrefix ?? '' })
    setShowSheet(true)
  }

  async function handleSave() {
    if (!accountId || !form.name.trim()) return
    setSaving(true)
    try {
      const prefix = form.orderPrefix || form.name.slice(0, 3).toUpperCase()
      const data = { ...form, orderPrefix: prefix }
      if (editing) {
        await updateDoc(doc(db, 'accounts', accountId, 'locations', editing.id), { ...data, updatedAt: serverTimestamp() })
      } else {
        await addDoc(collection(db, 'accounts', accountId, 'locations'), { ...data, createdAt: serverTimestamp() })
      }
      setShowSheet(false)
      fetchLocs()
    } finally { setSaving(false) }
  }

  async function handleDelete(l: Location) {
    if (!accountId || !confirm(`Delete location "${l.name}"?`)) return
    await deleteDoc(doc(db, 'accounts', accountId, 'locations', l.id))
    setLocations(prev => prev.filter(x => x.id !== l.id))
  }

  function f(label: string, key: keyof FormState, type = 'text', placeholder = '') {
    return (
      <div>
        <label className="block text-xs text-gray-500 mb-1">{label}</label>
        <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <button onClick={() => navigate('/settings')} className="flex items-center gap-1 text-navy text-sm font-medium"><ChevronLeft size={18} /> Settings</button>
        <h1 className="font-bold text-gray-900">Locations</h1>
        <button onClick={openAdd} className="flex items-center gap-1 text-navy text-sm font-medium"><Plus size={16} /> Add</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" /></div>
        ) : locations.map(l => (
          <div key={l.id} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-gray-900">{l.name}</p>
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{l.orderPrefix}</span>
                </div>
                {l.suburb && <p className="text-xs text-gray-400">{l.streetAddress ? l.streetAddress + ', ' : ''}{l.suburb}</p>}
                {l.phone && <p className="text-xs text-gray-400">{l.phone}</p>}
                <span className="text-xs text-blue-500">{l.shopType}</span>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(l)} className="p-2 text-gray-400 hover:text-navy"><Pencil size={14} /></button>
                <button onClick={() => handleDelete(l)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowSheet(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative z-10 bg-white rounded-t-3xl w-full max-w-sm pb-10 pt-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="text-center font-bold text-gray-900 mb-4 px-4">{editing ? 'Edit Location' : 'New Location'}</h3>
            <div className="px-6 space-y-3">
              {f('Location Name *', 'name', 'text', 'e.g. Carlingford')}
              {f('Street Address', 'streetAddress', 'text', 'e.g. 123 Pennant Hills Rd')}
              <div className="grid grid-cols-2 gap-2">
                {f('Suburb', 'suburb', 'text', 'e.g. Carlingford')}
                {f('State', 'state', 'text', 'NSW')}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {f('Phone', 'phone', 'tel')}
                {f('Order Prefix', 'orderPrefix', 'text', 'CAR')}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Shop Type</label>
                <select value={form.shopType} onChange={e => setForm(f => ({ ...f, shopType: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy bg-white">
                  <option value="alterations">Alterations</option>
                  <option value="dryCleaning">Dry Cleaning</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button onClick={handleSave} disabled={!form.name.trim() || saving}
                className="w-full py-3.5 rounded-xl bg-navy text-white font-semibold text-sm disabled:opacity-50 mt-2">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
