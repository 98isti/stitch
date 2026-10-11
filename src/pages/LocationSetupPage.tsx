import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, addDoc, serverTimestamp, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { Delete, ChevronRight, Plus } from 'lucide-react'

const STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']

async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

type Step = 'pick' | 'pin' | 'new-location'

export default function LocationSetupPage() {
  const navigate = useNavigate()
  const { accountId } = useAuth()
  const { locations, setActiveLocation } = useLocations(accountId)

  const [step, setStep] = useState<Step>('pick')
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)

  // PIN state
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [checking, setChecking] = useState(false)
  const [staffCache, setStaffCache] = useState<{ pinHash: string; role: string; isActive: boolean }[]>([])

  // New location form
  const [locForm, setLocForm] = useState({
    name: '', streetAddress: '', suburb: '', state: 'NSW', country: 'Australia', phone: '', dailyTarget: '1000'
  })
  const [savingLoc, setSavingLoc] = useState(false)

  // Pre-load staff for PIN check
  useEffect(() => {
    if (!accountId) return
    getDocs(query(collection(db, 'accounts', accountId, 'staff')))
      .then(snap => setStaffCache(snap.docs.map(d => d.data() as any)))
      .catch(() => {})
  }, [accountId])

  async function handleLocationSelect(locId: string) {
    setSelectedLocationId(locId)
    setCreatingNew(false)
    setPin('')
    setPinError('')
    setStep('pin')
  }

  function handleNewLocation() {
    setSelectedLocationId(null)
    setCreatingNew(true)
    setPin('')
    setPinError('')
    setStep('pin')
  }

  async function handlePinKey(digit: string) {
    if (pin.length >= 4 || checking) return
    const next = pin + digit
    setPin(next)
    setPinError('')

    if (next.length === 4) {
      setChecking(true)
      try {
        const hash = await hashPin(next)
        const match = staffCache.find(s => s.pinHash === hash && s.isActive && ['Manager', 'Owner'].includes(s.role))
        if (match) {
          if (creatingNew) {
            setStep('new-location')
          } else {
            // Activate selected location
            const loc = locations.find(l => l.id === selectedLocationId)
            if (loc) {
              setActiveLocation(loc)
              navigate('/pin')
            }
          }
        } else {
          setTimeout(() => { setPin(''); setPinError('Manager or Owner PIN required'); setChecking(false) }, 300)
          return
        }
      } catch {
        setPin(''); setPinError('Error checking PIN')
      }
      setChecking(false)
    }
  }

  async function handleSaveNewLocation() {
    if (!accountId || !locForm.name.trim()) return
    setSavingLoc(true)
    try {
      const docRef = await addDoc(collection(db, 'accounts', accountId, 'locations'), {
        name: locForm.name.trim(),
        streetAddress: locForm.streetAddress.trim(),
        suburb: locForm.suburb.trim(),
        state: locForm.state,
        country: locForm.country,
        phone: locForm.phone.trim(),
        dailyTarget: parseFloat(locForm.dailyTarget) || 1000,
        shopType: 'alterations',
        createdAt: serverTimestamp(),
      })
      setActiveLocation({ id: docRef.id, ...locForm, name: locForm.name.trim() })
      navigate('/pin')
    } catch (e) {
      console.error(e)
    } finally {
      setSavingLoc(false)
    }
  }

  const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  // ── Step: Pick location ──────────────────────────────────────────
  if (step === 'pick') {
    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="bg-white rounded-2xl px-6 py-3 inline-block shadow-lg mb-4">
              <img src="/stitch-logo.png" alt="Stitch" className="h-10 object-contain" />
            </div>
            <h2 className="text-white text-xl font-bold">Which location is this device for?</h2>
            <p className="text-white/50 text-sm mt-1">Select an existing location or set up a new one</p>
          </div>

          <div className="space-y-2 mb-4">
            {locations.map(loc => (
              <button key={loc.id} onClick={() => handleLocationSelect(loc.id)}
                className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 active:bg-white/30 text-white px-5 py-4 rounded-2xl transition-colors">
                <div className="text-left">
                  <p className="font-semibold">{loc.name}</p>
                  {loc.suburb && <p className="text-white/50 text-sm">{loc.suburb}{loc.state ? `, ${loc.state}` : ''}</p>}
                </div>
                <ChevronRight size={18} className="text-white/40 shrink-0" />
              </button>
            ))}
          </div>

          <button onClick={handleNewLocation}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-white/30 hover:border-white/50 text-white/70 hover:text-white px-5 py-4 rounded-2xl transition-colors">
            <Plus size={18} />
            <span className="font-medium">Set up a new location</span>
          </button>
        </div>
      </div>
    )
  }

  // ── Step: Manager/Owner PIN ──────────────────────────────────────
  if (step === 'pin') {
    const locationName = creatingNew ? 'New Location' : locations.find(l => l.id === selectedLocationId)?.name ?? ''
    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <div className="bg-white rounded-2xl px-6 py-3 inline-block shadow-lg mb-4">
            <img src="/stitch-logo.png" alt="Stitch" className="h-10 object-contain" />
          </div>
          <h2 className="text-white text-xl font-bold">{locationName}</h2>
          <p className="text-white/50 text-sm mt-1">Enter Manager or Owner PIN to confirm</p>
        </div>

        <div className="flex gap-4 mb-6">
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full transition-all duration-150 ${i < pin.length ? 'bg-white scale-110' : 'bg-white/25'}`} />
          ))}
        </div>

        {pinError && <p className="text-red-400 text-sm mb-4 text-center">{pinError}</p>}

        <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-6">
          {KEYS.map((k, i) => {
            if (k === '') return <div key={i} />
            if (k === '⌫') return (
              <button key={i} onClick={() => { setPin(p => p.slice(0,-1)); setPinError('') }}
                className="h-16 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-colors">
                <Delete size={20} className="text-white" />
              </button>
            )
            return (
              <button key={i} onClick={() => handlePinKey(k)}
                className="h-16 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-2xl font-semibold transition-colors">
                {k}
              </button>
            )
          })}
        </div>

        <button onClick={() => setStep('pick')} className="text-white/40 hover:text-white/70 text-sm transition-colors">
          ← Back
        </button>
      </div>
    )
  }

  // ── Step: New location form ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => setStep('pick')} className="text-navy text-sm font-medium">← Back</button>
        <h1 className="flex-1 text-center font-bold text-gray-900">New Location</h1>
        <button onClick={handleSaveNewLocation} disabled={savingLoc || !locForm.name.trim()}
          className="text-navy text-sm font-semibold disabled:opacity-40">
          {savingLoc ? 'Saving…' : 'Done'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
          {[
            ['Location Name *', 'name', 'e.g. Bondi Junction'],
            ['Street Address', 'streetAddress', 'e.g. 500 Oxford Street'],
            ['Suburb', 'suburb', 'e.g. Bondi Junction'],
            ['Phone', 'phone', 'e.g. 02 9387 1234'],
          ].map(([label, key, placeholder]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</label>
              <input value={(locForm as any)[key]} onChange={e => setLocForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-navy" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">State</label>
              <select value={locForm.state} onChange={e => setLocForm(f => ({ ...f, state: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy bg-white">
                {STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Daily Target ($)</label>
              <input type="number" value={locForm.dailyTarget} onChange={e => setLocForm(f => ({ ...f, dailyTarget: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
            </div>
          </div>
        </div>

        <button onClick={handleSaveNewLocation} disabled={savingLoc || !locForm.name.trim()}
          className="w-full py-4 rounded-2xl bg-navy text-white font-bold disabled:opacity-50">
          {savingLoc ? 'Saving…' : 'Create Location & Continue'}
        </button>
      </div>
    </div>
  )
}
