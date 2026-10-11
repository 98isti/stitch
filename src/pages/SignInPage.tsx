import { useState, useEffect } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useStaff } from '../context/StaffContext'
import { useLocations } from '../hooks/useLocations'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Check } from 'lucide-react'

function now() {
  return new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })
}
function today() {
  return new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function SignInPage() {
  const { accountId } = useAuth()
  const { staff } = useStaff()
  const { locations, activeLocation } = useLocations(accountId)
  const navigate = useNavigate()

  const [type, setType] = useState<'in' | 'out'>('in')
  const [locationName, setLocationName] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [currentTime, setCurrentTime] = useState(now())

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Default location from active location
  useEffect(() => {
    if (activeLocation?.name) setLocationName(activeLocation.name)
  }, [activeLocation])

  async function handleSubmit() {
    if (!accountId || !staff || !locationName) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'accounts', accountId, 'signIns'), {
        employeeId: staff.id,
        employeeName: staff.name,
        location: locationName,
        type,
        timestamp: serverTimestamp(),
      })
      setDone(true)
      setTimeout(() => { setDone(false); navigate('/pos') }, 2000)
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
  }

  const initials = staff?.name
    ? staff.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/pos')} className="flex items-center gap-1 text-navy text-sm font-medium hover:opacity-70">
          <ChevronLeft size={18} /> Back
        </button>
        <h1 className="flex-1 text-center font-bold text-gray-900">Sign In / Sign Out</h1>
        <div className="w-16" />
      </div>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md space-y-4">

          {/* Date + Time */}
          <div className="text-center mb-2">
            <p className="text-3xl font-bold text-navy tabular-nums">{currentTime}</p>
            <p className="text-sm text-gray-400 mt-0.5">{today()}</p>
          </div>

          {/* Staff card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-navy flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg">{initials}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Employee</p>
              <p className="text-xl font-bold text-gray-900">{staff?.name ?? '—'}</p>
              <p className="text-xs text-gray-400">{staff?.role ?? ''}</p>
            </div>
          </div>

          {/* Sign In / Sign Out toggle */}
          <div className="bg-white rounded-2xl border border-gray-100 p-2">
            <div className="grid grid-cols-2 gap-1">
              <button onClick={() => setType('in')}
                className={`py-4 rounded-xl text-base font-bold transition-all ${
                  type === 'in'
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}>
                Sign In
              </button>
              <button onClick={() => setType('out')}
                className={`py-4 rounded-xl text-base font-bold transition-all ${
                  type === 'out'
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}>
                Sign Out
              </button>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Location</p>
            <select
              value={locationName}
              onChange={e => setLocationName(e.target.value)}
              className="w-full text-base font-semibold text-gray-900 focus:outline-none bg-white">
              {locations.map(l => (
                <option key={l.id} value={l.name}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={saving || done || !staff || !locationName}
            className={`w-full py-4 rounded-2xl text-white text-base font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
              done ? 'bg-green-500' : 'bg-navy hover:bg-navy-light'
            }`}>
            {done ? (
              <><Check size={20} /> {type === 'in' ? 'Signed In!' : 'Signed Out!'}</>
            ) : saving ? 'Saving…' : (
              type === 'in' ? 'Sign In' : 'Sign Out'
            )}
          </button>

        </div>
      </div>
    </div>
  )
}
