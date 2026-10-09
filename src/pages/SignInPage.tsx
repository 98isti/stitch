import { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { ChevronLeft, LogIn, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface StaffMember { id: string; firstName: string; lastName: string; isActive: boolean }
interface SignInRecord {
  id: string; employeeName: string; employeeId: string; location: string; type: string; timestamp: { toDate: () => Date }
}

export default function SignInPage() {
  const { accountId } = useAuth()
  const { activeLocation } = useLocations(accountId)
  const navigate = useNavigate()

  const [staff, setStaff] = useState<StaffMember[]>([])
  const [logs, setLogs] = useState<SignInRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  async function fetchData() {
    if (!accountId) return
    setLoading(true)
    try {
      const [staffSnap, logsSnap] = await Promise.all([
        getDocs(query(collection(db, 'accounts', accountId, 'staff'), orderBy('firstName'))),
        getDocs(query(collection(db, 'accounts', accountId, 'signIns'), orderBy('timestamp', 'desc'))),
      ])
      setStaff(staffSnap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember)).filter(s => s.isActive))
      // Today's logs only
      const todayStr = new Date().toDateString()
      setLogs(logsSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as SignInRecord))
        .filter(r => {
          try { return r.timestamp.toDate().toDateString() === todayStr } catch { return false }
        })
      )
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [accountId])

  async function logSignIn(s: StaffMember, type: 'in' | 'out') {
    if (!accountId) return
    setSaving(s.id)
    try {
      await addDoc(collection(db, 'accounts', accountId, 'signIns'), {
        employeeName: `${s.firstName} ${s.lastName}`,
        employeeId: s.id,
        location: activeLocation?.name ?? '',
        type,
        timestamp: serverTimestamp(),
      })
      fetchData()
    } finally { setSaving(null) }
  }

  // Determine current sign-in status for each staff member
  function getCurrentStatus(staffId: string): 'in' | 'out' {
    const latest = logs.find(l => l.employeeId === staffId)
    return latest?.type === 'in' ? 'in' : 'out'
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/pos')} className="flex items-center gap-1 text-navy text-sm font-medium"><ChevronLeft size={18} /> Back</button>
        <h1 className="flex-1 text-center font-bold text-gray-900">Sign In / Sign Out</h1>
        <div className="w-16" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {activeLocation && (
          <p className="text-xs text-gray-400 px-1">Location: <span className="font-semibold text-gray-600">{activeLocation.name}</span></p>
        )}

        {/* Staff sign in/out buttons */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" /></div>
          ) : staff.map(s => {
            const status = getCurrentStatus(s.id)
            const isLoading = saving === s.id
            return (
              <div key={s.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-sm shrink-0">
                  {s.firstName[0]}{s.lastName?.[0] ?? ''}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{s.firstName} {s.lastName}</p>
                  <span className={`text-xs font-medium ${status === 'in' ? 'text-green-600' : 'text-gray-400'}`}>
                    {status === 'in' ? '● Signed in' : '○ Signed out'}
                  </span>
                </div>
                <button
                  disabled={isLoading}
                  onClick={() => logSignIn(s, status === 'in' ? 'out' : 'in')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                    status === 'in'
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}>
                  {status === 'in' ? <LogOut size={14} /> : <LogIn size={14} />}
                  {status === 'in' ? 'Sign Out' : 'Sign In'}
                </button>
              </div>
            )
          })}
        </div>

        {/* Today's log */}
        {logs.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Today's Log</h3>
            <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
              {logs.map(l => (
                <div key={l.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{l.employeeName}</p>
                    <p className="text-xs text-gray-400">{l.location}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${l.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {l.type === 'in' ? 'In' : 'Out'}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(() => { try { return l.timestamp.toDate().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) } catch { return '' } })()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
