import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { Plus, Pencil, Trash2, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export interface StaffMember {
  id: string
  firstName: string
  lastName: string
  pinHash: string
  payRate: number
  role: string
  isActive: boolean
}

async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

const ROLES = ['Seamstress', 'Manager', 'Owner', 'Other']

interface FormState { firstName: string; lastName: string; pin: string; payRate: string; role: string; isActive: boolean }
const EMPTY_FORM: FormState = { firstName: '', lastName: '', pin: '', payRate: '', role: 'Seamstress', isActive: true }

export default function StaffPage() {
  const { accountId } = useAuth()
  const navigate = useNavigate()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showSheet, setShowSheet] = useState(false)
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function fetchStaff() {
    if (!accountId) return
    setLoading(true)
    try {
      const snap = await getDocs(query(collection(db, 'accounts', accountId, 'staff'), orderBy('firstName')))
      setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember)))
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchStaff() }, [accountId])

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setShowSheet(true) }
  function openEdit(s: StaffMember) {
    setEditing(s)
    setForm({ firstName: s.firstName, lastName: s.lastName, pin: '', payRate: String(s.payRate), role: s.role, isActive: s.isActive })
    setShowSheet(true)
  }

  async function handleSave() {
    if (!accountId || !form.firstName) return
    setSaving(true)
    try {
      const pinHash = form.pin ? await hashPin(form.pin) : (editing?.pinHash ?? '')
      const data = {
        firstName: form.firstName,
        lastName: form.lastName,
        pinHash,
        payRate: parseFloat(form.payRate) || 0,
        role: form.role,
        isActive: form.isActive,
      }
      if (editing) {
        await updateDoc(doc(db, 'accounts', accountId, 'staff', editing.id), { ...data, updatedAt: serverTimestamp() })
      } else {
        await addDoc(collection(db, 'accounts', accountId, 'staff'), { ...data, createdAt: serverTimestamp() })
      }
      setShowSheet(false)
      fetchStaff()
    } finally { setSaving(false) }
  }

  async function handleDelete(s: StaffMember) {
    if (!accountId || !confirm(`Delete ${s.firstName} ${s.lastName}?`)) return
    await deleteDoc(doc(db, 'accounts', accountId, 'staff', s.id))
    setStaff(prev => prev.filter(x => x.id !== s.id))
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <button onClick={() => navigate('/pos')} className="flex items-center gap-1 text-navy text-sm font-medium"><ChevronLeft size={18} /> Back</button>
        <h1 className="font-bold text-gray-900">Staff</h1>
        <button onClick={openAdd} className="flex items-center gap-1 text-navy text-sm font-medium"><Plus size={16} /> Add</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" /></div>
        ) : staff.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-3">👤</p><p className="text-sm">No staff added yet</p></div>
        ) : (
          staff.map(s => (
            <div key={s.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-sm shrink-0">
                {s.firstName[0]}{s.lastName?.[0] ?? ''}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{s.firstName} {s.lastName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">{s.role}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">${s.payRate}/hr</span>
                  {!s.isActive && <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">Inactive</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(s)} className="p-2 text-gray-400 hover:text-navy rounded-lg hover:bg-gray-50"><Pencil size={15} /></button>
                <button onClick={() => handleDelete(s)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50"><Trash2 size={15} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Sheet */}
      {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowSheet(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative z-10 bg-white rounded-t-3xl w-full max-w-sm pb-10 pt-4 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="text-center font-bold text-gray-900 text-base mb-4 px-4">
              {editing ? 'Edit Staff Member' : 'Add Staff Member'}
            </h3>
            <div className="px-6 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  placeholder="First Name *"
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
                <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  placeholder="Last Name"
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
              </div>
              <input type="password" value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))}
                placeholder={editing ? 'New PIN (leave blank to keep)' : '4-digit PIN *'}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" value={form.payRate} onChange={e => setForm(f => ({ ...f, payRate: e.target.value }))}
                  placeholder="Pay rate $/hr"
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy bg-white">
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-3 py-1">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 accent-navy" />
                <span className="text-sm text-gray-700">Active</span>
              </label>
              <button onClick={handleSave} disabled={!form.firstName || saving}
                className="w-full py-3.5 rounded-xl bg-navy text-white font-semibold text-sm disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Staff Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
