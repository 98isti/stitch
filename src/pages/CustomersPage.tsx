import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { Search, ChevronRight, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Customer { id: string; firstName: string; lastName: string; phone: string; email?: string }

export default function CustomersPage() {
  const { accountId } = useAuth()
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!accountId) return
    getDocs(query(collection(db, 'accounts', accountId, 'customers'), orderBy('firstName')))
      .then(snap => {
        setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)))
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [accountId])

  const filtered = customers.filter(c => {
    if (!search) return true
    const t = search.toLowerCase()
    return `${c.firstName} ${c.lastName}`.toLowerCase().includes(t) || c.phone?.includes(search) || c.email?.toLowerCase().includes(t)
  })

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/pos')} className="flex items-center gap-1 text-navy text-sm font-medium"><ChevronLeft size={18} /> Back</button>
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
          <div key={c.id} className="bg-white rounded-xl px-4 py-3 border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-sm shrink-0">
              {c.firstName[0]}{c.lastName?.[0] ?? ''}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900">{c.firstName} {c.lastName}</p>
              <p className="text-xs text-gray-400">{c.phone}{c.email ? ' · ' + c.email : ''}</p>
            </div>
            <ChevronRight size={15} className="text-gray-300 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
