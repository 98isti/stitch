import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, query, where, getDocs, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp, getDoc
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useStaff } from '../context/StaffContext'
import { useLocations } from '../hooks/useLocations'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  locationId: string
  locationName: string
  startDate: string  // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
  status: 'pending' | 'approved' | 'denied'
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatDisplay(s: string): string {
  const [y, m, day] = s.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`
}

function daysInRange(start: string, end: string): string[] {
  const result: string[] = []
  const cur = new Date(start)
  const endD = new Date(end)
  while (cur <= endD) { result.push(toDateStr(cur)); cur.setDate(cur.getDate() + 1) }
  return result
}

function monthDays(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) { days.push(new Date(d)); d.setDate(d.getDate() + 1) }
  return days
}

// Monday-first offset (Mon=0 … Sun=6)
function firstDayOffset(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7
}

// ── Component ──────────────────────────────────────────────────────────────

export default function LeavePage() {
  const navigate    = useNavigate()
  const { accountId } = useAuth()
  const { staff }   = useStaff()
  const { activeLocation } = useLocations(accountId)

  const isManager = staff?.role === 'Manager' || staff?.role === 'Owner'
  const today     = toDateStr(new Date())

  const [year, setYear]   = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())

  const [requests, setRequests]         = useState<LeaveRequest[]>([])
  const [maxPerDay, setMaxPerDay]       = useState(3)
  const [loading, setLoading]           = useState(false)

  // Apply sheet
  const [showApply, setShowApply]   = useState(false)
  const [applyStart, setApplyStart] = useState('')
  const [applyEnd, setApplyEnd]     = useState('')
  const [applying, setApplying]     = useState(false)

  // Edit/cancel sheet
  const [editReq, setEditReq] = useState<LeaveRequest | null>(null)

  // ── Load maxLeavePerDay from location doc ───────────────────────────────

  useEffect(() => {
    if (!accountId || !activeLocation) return
    getDoc(doc(db, 'accounts', accountId, 'locations', activeLocation.id))
      .then(snap => { if (snap.exists()) setMaxPerDay(snap.data().maxLeavePerDay ?? 3) })
  }, [accountId, activeLocation?.id])

  // ── Load leave requests for this location ───────────────────────────────

  async function load() {
    if (!accountId || !activeLocation) return
    setLoading(true)
    const snap = await getDocs(query(
      collection(db, 'accounts', accountId, 'leaveRequests'),
      where('locationId', '==', activeLocation.id),
      where('status', 'in', ['pending', 'approved'])
    ))
    setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRequest)))
    setLoading(false)
  }

  useEffect(() => { load() }, [accountId, activeLocation?.id, year, month])

  // ── Per-day count map ───────────────────────────────────────────────────

  const dayCount = useMemo(() => {
    const map: Record<string, number> = {}
    const mStart = `${year}-${String(month + 1).padStart(2,'0')}-01`
    const last   = new Date(year, month + 1, 0)
    const mEnd   = toDateStr(last)

    for (const req of requests) {
      const s = req.startDate > mStart ? req.startDate : mStart
      const e = req.endDate   < mEnd   ? req.endDate   : mEnd
      if (s > e) continue
      for (const d of daysInRange(s, e)) {
        map[d] = (map[d] ?? 0) + 1
      }
    }
    return map
  }, [requests, year, month])

  // ── My leave days ───────────────────────────────────────────────────────

  const myDays = useMemo(() => {
    if (!staff) return new Set<string>()
    const set = new Set<string>()
    for (const r of requests) {
      if (r.employeeId === staff.id) daysInRange(r.startDate, r.endDate).forEach(d => set.add(d))
    }
    return set
  }, [requests, staff])

  // ── Day colour ──────────────────────────────────────────────────────────

  function fill(dateStr: string): 'white' | 'yellow' | 'red' {
    const n = dayCount[dateStr] ?? 0
    if (n >= maxPerDay)                           return 'red'
    if (n >= maxPerDay - 1 && maxPerDay > 1)      return 'yellow'
    return 'white'
  }

  // ── Calendar interaction ────────────────────────────────────────────────

  function handleDay(dateStr: string) {
    if (dateStr < today) return
    const myReq = requests.find(r =>
      r.employeeId === staff?.id && r.startDate <= dateStr && r.endDate >= dateStr
    )
    if (myReq) { setEditReq(myReq); return }
    if (fill(dateStr) === 'red') return
    setApplyStart(dateStr); setApplyEnd(dateStr); setShowApply(true)
  }

  // ── Submit leave ────────────────────────────────────────────────────────

  async function submitLeave() {
    if (!accountId || !activeLocation || !staff) return
    if (!applyStart || !applyEnd || applyEnd < applyStart) return
    setApplying(true)
    await addDoc(collection(db, 'accounts', accountId, 'leaveRequests'), {
      employeeId:   staff.id,
      employeeName: staff.name,
      locationId:   activeLocation.id,
      locationName: activeLocation.name,
      startDate:    applyStart,
      endDate:      applyEnd,
      status:       'pending',
      createdAt:    serverTimestamp(),
      updatedAt:    serverTimestamp(),
    })
    setShowApply(false); setApplying(false); load()
  }

  // ── Cancel leave ────────────────────────────────────────────────────────

  async function cancelLeave(req: LeaveRequest) {
    if (!accountId) return
    await deleteDoc(doc(db, 'accounts', accountId, 'leaveRequests', req.id))
    setEditReq(null); load()
  }

  // ── Approve / Deny ──────────────────────────────────────────────────────

  async function setStatus(req: LeaveRequest, status: 'approved' | 'denied') {
    if (!accountId) return
    await updateDoc(doc(db, 'accounts', accountId, 'leaveRequests', req.id), {
      status, updatedAt: serverTimestamp()
    })
    load()
  }

  // ── Month navigation ────────────────────────────────────────────────────

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
  }

  // ── Derived ─────────────────────────────────────────────────────────────

  const days      = monthDays(year, month)
  const offset    = firstDayOffset(year, month)
  const weekdays  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const monthName = new Date(year, month).toLocaleString('en-AU', { month: 'long', year: 'numeric' })

  const myUpcoming   = requests.filter(r => r.employeeId === staff?.id && r.endDate >= today)
  const pendingForMgr = requests.filter(r => r.status === 'pending')

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-navy font-medium text-sm">← Back</button>
        <h1 className="flex-1 text-center font-bold text-navy text-base">Leave</h1>
        <span className="w-12" />
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* Calendar card */}
        <div className="bg-white rounded-2xl shadow-sm p-4">

          <p className="text-xs text-gray-400 text-center mb-3">{activeLocation?.name}</p>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronLeft size={18} className="text-navy" />
            </button>
            <span className="font-semibold text-navy">{monthName}</span>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronRight size={18} className="text-navy" />
            </button>
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-3 mb-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block" />Available
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-yellow-200 inline-block" />Getting full
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-200 inline-block" />Unavailable
            </span>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {weekdays.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-0.5">{d}</div>
            ))}
          </div>

          {/* Grid */}
          {loading
            ? <p className="text-center text-sm text-gray-400 py-8">Loading…</p>
            : (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: offset }).map((_, i) => <div key={`b${i}`} />)}
                {days.map(day => {
                  const ds      = toDateStr(day)
                  const f       = fill(ds)
                  const isMyDay = myDays.has(ds)
                  const isPast  = ds < today
                  const isToday = ds === today

                  const bg = f === 'red' ? 'bg-red-100' : f === 'yellow' ? 'bg-yellow-100' : 'bg-white'
                  const border = isMyDay
                    ? 'border-2 border-navy'
                    : isToday
                      ? 'border-2 border-navy/40'
                      : 'border border-gray-200'

                  return (
                    <button
                      key={ds}
                      onClick={() => handleDay(ds)}
                      disabled={isPast}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-colors ${bg} ${border} ${isPast ? 'opacity-25 cursor-default' : 'hover:opacity-80'}`}
                    >
                      <span className={`text-sm font-bold ${isToday ? 'text-navy' : 'text-gray-700'}`}>
                        {day.getDate()}
                      </span>
                      {isMyDay && (
                        <span className="text-navy font-bold leading-none" style={{ fontSize: 8 }}>Me</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          }
        </div>

        {/* My upcoming leave */}
        {myUpcoming.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">My Leave</p>
            <div className="space-y-2 divide-y divide-gray-100">
              {myUpcoming.map(req => (
                <div key={req.id} className="flex items-center justify-between pt-2 first:pt-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {formatDisplay(req.startDate)}
                      {req.startDate !== req.endDate && ` → ${formatDisplay(req.endDate)}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {req.status === 'pending' ? '⏳ Pending approval'
                        : req.status === 'approved' ? '✅ Approved'
                        : '❌ Denied'}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditReq(req)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1">
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manager: pending approvals */}
        {isManager && pendingForMgr.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Pending Approval ({pendingForMgr.length})
            </p>
            <div className="space-y-3">
              {pendingForMgr.map(req => (
                <div key={req.id} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{req.employeeName}</p>
                      <p className="text-xs text-gray-500">
                        {formatDisplay(req.startDate)}
                        {req.startDate !== req.endDate && ` → ${formatDisplay(req.endDate)}`}
                      </p>
                    </div>
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                      Pending
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setStatus(req, 'denied')}
                      className="flex-1 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors">
                      Deny
                    </button>
                    <button onClick={() => setStatus(req, 'approved')}
                      className="flex-1 py-2 rounded-xl bg-navy text-white text-xs font-semibold hover:bg-navy/90 transition-colors">
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manager: no pending */}
        {isManager && pendingForMgr.length === 0 && !loading && (
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <p className="text-sm text-gray-400">No pending leave requests</p>
          </div>
        )}

      </div>

      {/* Apply Leave sheet */}
      {showApply && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowApply(false)} />
          <div className="relative w-full bg-white rounded-t-2xl p-6 space-y-4 max-w-lg mx-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-navy text-lg">Apply for Leave</h2>
              <button onClick={() => setShowApply(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" value={applyStart} min={today}
                  onChange={e => { setApplyStart(e.target.value); if (applyEnd < e.target.value) setApplyEnd(e.target.value) }}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-navy" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input type="date" value={applyEnd} min={applyStart || today}
                  onChange={e => setApplyEnd(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-navy" />
              </div>
            </div>
            <button onClick={submitLeave}
              disabled={applying || !applyStart || !applyEnd || applyEnd < applyStart}
              className="w-full bg-navy text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-navy/90 transition-colors">
              {applying ? 'Submitting…' : 'Submit Leave Request'}
            </button>
          </div>
        </div>
      )}

      {/* Edit / Cancel sheet */}
      {editReq && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="fixed inset-0 bg-black/40" onClick={() => setEditReq(null)} />
          <div className="relative w-full bg-white rounded-t-2xl p-6 space-y-4 max-w-lg mx-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-navy text-lg">My Leave</h2>
              <button onClick={() => setEditReq(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-800">
                {formatDisplay(editReq.startDate)}
                {editReq.startDate !== editReq.endDate && ` → ${formatDisplay(editReq.endDate)}`}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {editReq.status === 'pending' ? '⏳ Pending approval'
                  : editReq.status === 'approved' ? '✅ Approved'
                  : '❌ Denied'}
              </p>
            </div>
            <button onClick={() => cancelLeave(editReq)}
              className="w-full border border-red-300 text-red-600 py-3 rounded-xl font-semibold text-sm hover:bg-red-50 transition-colors">
              Cancel This Leave Request
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
