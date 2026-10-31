import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy, updateDoc, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { Search, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Customer { id: string; firstName: string; lastName: string; phone: string; email?: string; orderCount?: number; locationId?: string; locationName?: string }

export default function CustomersPage() {
  const { accountId } = useAuth()
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!accountId) return
    getDocs(query(collection(db, 'accounts', accountId, 'customers'), orderBy('firstName')))
      .then(snap => {
        setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)))
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [accountId])

  function startEdit(c: Customer) {
    setEditing(c)
    setForm({ firstName: c.firstName, lastName: c.lastName ?? '', phone: c.phone ?? '', email: c.email ?? '' })
  }

  async function saveEdit() {
    if (!accountId || !editing) return
    setSaving(true)
    try {
      const newPhone = form.phone.trim()
      const phoneChanged = newPhone !== editing.id

      if (phoneChanged && newPhone) {
        // Create new doc with new phone as ID, delete old
        await setDoc(doc(db, 'accounts', accountId, 'customers', newPhone), {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
          phone: newPhone,
          email: form.email.trim() || null,
          orderCount: editing.orderCount ?? 0,
          locationId: editing.locationId ?? '',
          locationName: editing.locationName ?? '',
          updatedAt: serverTimestamp(),
        })
        await deleteDoc(doc(db, 'accounts', accountId, 'customers', editing.id))
        setCustomers(prev => prev.map(c => c.id === editing.id
          ? { ...c, ...form, id: newPhone, name: `${form.firstName} ${form.lastName}`.trim() }
          : c
        ))
      } else {
        // Name / email only
        await updateDoc(doc(db, 'accounts', accountId, 'customers', editing.id), {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
          email: form.email.trim() || null,
          updatedAt: serverTimestamp(),
        })
        setCustomers(prev => prev.map(c => c.id === editing.id
          ? { ...c, ...form, name: `${form.firstName} ${form.lastName}`.trim() }
          : c
        ))
      }
      setEditing(null)
    } finally { setSaving(false) }
  }

  const filtered = customers.filter(c => {
    if (!search) return true
    const t = search.toLowerCase()
    return `${c.firstName} ${c.lastName}`.toLowerCase().includes(t) || c.phone?.includes(search) || c.email?.toLowerCase().includes(t)
  })

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => { const isM = localStorage.getItem('stitch_device_mode') === 'management'; navigate(isM ? '/mgmt-more' : '/pos') }}
          className="flex items-center gap-1 text-navy text-sm font-medium"><ChevronLeft size={18} /> Back</button>
        <h1 className="flex-1 text-center font-bold text-gray-900">Customers</h1>
        <span className="text-xs text-gray-400 w-16 text-right">{filtered.length}</span>
      </div>

      <div className="bg-white border-b border-gray-100 px-4 py-2.5 shrink-0">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, email…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-navy" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-3">👥</p><p className="text-sm">No customers found</p></div>
        ) : filtered.map(c => (
          <button key={c.id} onClick={() => startEdit(c)}
            className="w-full bg-white rounded-xl px-4 py-3 border border-gray-100 flex items-center gap-3 text-left hover:bg-gray-50 active:scale-[0.99] transition-all">
            <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-sm shrink-0">
              {c.firstName[0]}{c.lastName?.[0] ?? ''}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900">{c.firstName} {c.lastName}</p>
              <p className="text-xs text-gray-400">{c.phone}{c.email ? ' · ' + c.email : ''}</p>
            </div>
            <ChevronRight size={15} className="text-gray-300 shrink-0" />
          </button>
        ))}
      </div>

      {/* Edit sheet */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setEditing(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative z-10 bg-white rounded-t-3xl w-full max-w-sm pb-10 pt-4 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between px-5 mb-5">
              <h3 className="font-bold text-gray-900 text-lg">Edit Customer</h3>
              <button onClick={() => setEditing(null)} className="p-1 rounded-full hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="px-5 flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 mb-1">First Name</p>
                  <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Last Name</p>
                  <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Phone</p>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  inputMode="tel" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
                {form.phone !== editing.id && <p className="text-xs text-amber-500 mt-1">⚠️ Changing phone creates a new record (old phone removed)</p>}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Email (optional)</p>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  inputMode="email" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
              </div>
              <button onClick={saveEdit} disabled={saving || !form.firstName.trim()}
                className="w-full py-3.5 rounded-2xl bg-navy text-white font-bold text-sm disabled:opacity-40 mt-1">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
