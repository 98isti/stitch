import { useEffect, useState, useMemo } from 'react'
import { collection, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { ChevronLeft, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getAuth } from 'firebase/auth'

interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  locationId: string
  locationName: string
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
  status: 'pending' | 'approved' | 'denied'
  createdAt?: { seconds: number }
  actionBy?: string   // name/email of manager who approved or denied
  actionAt?: { seconds: number }
}

function formatDisplay(s: string): string {
  const [y, m, day] = s.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`
}

function dayCount(start: string, end: string): number {
  const s = new Date(start), e = new Date(end)
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1
}

export default function ManagementLeavePage() {
  const { accountId } = useAuth()
  const { locations } = useLocations(accountId)
  const navigate = useNavigate()

  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'approved' | 'denied' | 'all'>('pending')

  async function load() {
    if (!accountId) return
    setLoading(true)
    const snap = await getDocs(collection(db, 'accounts', accountId, 'leaveRequests')).catch(() => null)
    if (snap) setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRequest)))
    setLoading(false)
  }

  useEffect(() => { load() }, [accountId])

  // Manager identity — use display name or email
  function getManagerName(): string {
    const user = getAuth().currentUser
    return user?.displayName || user?.email || 'Manager'
  }

  async function handleAction(req: LeaveRequest, action: 'approved' | 'denied') {
    if (!accountId) return
    setActioningId(req.id)
    try {
      await updateDoc(doc(db, 'accounts', accountId, 'leaveRequests', req.id), {
        status: action,
        actionBy: getManagerName(),
        actionAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setRequests(prev => prev.map(r =>
        r.id === req.id ? { ...r, status: action, actionBy: getManagerName() } : r
      ))
    } catch (e) {
      console.error('Action failed:', e)
    }
    setActioningId(null)
  }

  // Filter
  const filtered = useMemo(() => {
    return requests.filter(r => {
      const locMatch = selectedLocationId === 'all' || r.locationId === selectedLocationId
      const statusMatch = selectedStatus === 'all' || r.status === selectedStatus
      return locMatch && statusMatch
    }).sort((a, b) => {
      // Pending first, then by createdAt desc
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (b.status === 'pending' && a.status !== 'pending') return 1
      return (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
    })
  }, [requests, selectedLocationId, selectedStatus])

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 bg-white border-b border-gray-100 flex-shrink-0">
        <button
          onClick={() => navigate('/mgmt-more')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 border border-gray-200"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold text-gray-900">Leave Requests</h1>
          {pendingCount > 0 && (
            <span className="text-xs text-orange-500 font-semibold">{pendingCount} pending</span>
          )}
        </div>
        <button onClick={load} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 border border-gray-200">
          <RefreshCw size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-4 py-3 flex-shrink-0 bg-white border-b border-gray-100">
        {/* Location */}
        <select
          value={selectedLocationId}
          onChange={e => setSelectedLocationId(e.target.value)}
          className="flex-1 text-sm font-semibold text-blue-500 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none"
        >
          <option value="all">All Locations</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>

        {/* Status */}
        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value as typeof selectedStatus)}
          className="flex-1 text-sm font-semibold text-blue-500 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
          <option value="all">All</option>
        </select>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-200">
            <p className="text-gray-400 text-sm">
              {selectedStatus === 'pending' ? 'No pending leave requests 🎉' : 'No leave requests found'}
            </p>
          </div>
        ) : (
          filtered.map(req => (
            <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Status stripe */}
              <div className={`h-1 w-full ${
                req.status === 'pending' ? 'bg-orange-400' :
                req.status === 'approved' ? 'bg-green-400' : 'bg-red-400'
              }`} />

              <div className="p-4">
                {/* Employee + location */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-base font-bold text-gray-900">{req.employeeName}</p>
                    <p className="text-xs text-gray-400">{req.locationName}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    req.status === 'pending'  ? 'bg-orange-100 text-orange-600' :
                    req.status === 'approved' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {req.status === 'pending' ? 'Pending' : req.status === 'approved' ? 'Approved' : 'Denied'}
                  </span>
                </div>

                {/* Dates */}
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-3">
                  <p className="text-sm font-medium text-gray-800">
                    {req.startDate === req.endDate
                      ? formatDisplay(req.startDate)
                      : `${formatDisplay(req.startDate)} → ${formatDisplay(req.endDate)}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {dayCount(req.startDate, req.endDate)} {dayCount(req.startDate, req.endDate) === 1 ? 'day' : 'days'}
                  </p>
                </div>

                {/* Who actioned */}
                {req.actionBy && req.status !== 'pending' && (
                  <p className="text-xs text-gray-400 mb-3">
                    {req.status === 'approved' ? '✅ Approved' : '❌ Denied'} by {req.actionBy}
                  </p>
                )}

                {/* Approve / Deny buttons — pending only */}
                {req.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(req, 'denied')}
                      disabled={actioningId === req.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-40"
                    >
                      <XCircle size={16} />
                      Deny
                    </button>
                    <button
                      onClick={() => handleAction(req, 'approved')}
                      disabled={actioningId === req.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 active:bg-green-700 transition-colors disabled:opacity-40"
                    >
                      <CheckCircle size={16} />
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
