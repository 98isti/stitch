import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Users } from 'lucide-react'

interface Account {
  id: string
  businessName?: string
  email?: string
  plan?: string
  createdAt?: { toDate: () => Date }
}

// Admin-only — only show to accounts with role=admin (checked via users/{uid}.isAdmin)
export default function AdminPage() {
  const { accountId } = useAuth()
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch all accounts (requires Firebase Security Rules to allow admin read)
    getDocs(collection(db, 'accounts'))
      .then(async snap => {
        const all: Account[] = []
        for (const d of snap.docs) {
          const profile = await getDocs(collection(db, 'accounts', d.id, 'profile'))
          const profileData = profile.docs[0]?.data() ?? {}
          all.push({ id: d.id, ...profileData })
        }
        setAccounts(all)
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [accountId])

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/pos')} className="flex items-center gap-1 text-navy text-sm font-medium"><ChevronLeft size={18} /> Back</button>
        <h1 className="flex-1 text-center font-bold text-gray-900">Admin — All Accounts</h1>
        <span className="text-xs text-gray-400 w-16 text-right">{accounts.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No accounts found</p>
          </div>
        ) : accounts.map(acc => (
          <div key={acc.id} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">{acc.businessName || 'Unnamed'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{acc.email}</p>
                <p className="text-xs font-mono text-gray-300 mt-0.5">{acc.id}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${acc.plan === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-600'}`}>
                {acc.plan ?? 'trial'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
