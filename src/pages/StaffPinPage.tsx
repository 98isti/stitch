import { useState, useEffect } from 'react'
import { Delete, ArrowLeft, Check } from 'lucide-react'
import { collection, getDocs, query, doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useStaff } from '../context/StaffContext'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'

type Mode = 'login' | 'reset-select' | 'reset-old-pin' | 'reset-new-pin' | 'reset-confirm' | 'reset-done'

type StaffMember = { id: string; firstName: string; lastName: string; pinHash: string; role: string; isActive: boolean }

async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function StaffPinPage() {
  const { accountId } = useAuth()
  const { setStaff } = useStaff()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('login')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [staffCache, setStaffCache] = useState<StaffMember[]>([])

  // Reset flow state
  const [resetStaff, setResetStaff] = useState<StaffMember | null>(null)
  const [newPin, setNewPin] = useState('')

  // Pre-load staff list on mount
  useEffect(() => {
    if (!accountId) return
    getDocs(query(collection(db, 'accounts', accountId, 'staff')))
      .then(snap => setStaffCache(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))))
      .catch(() => {})
  }, [accountId])

  function resetToLogin() {
    setMode('login'); setPin(''); setError('')
    setResetStaff(null); setNewPin('')
  }

  // ── Login flow ────────────────────────────────────────────────────────────
  async function handleKey(digit: string) {
    if (pin.length >= 4 || checking) return
    const next = pin + digit
    setPin(next)
    setError('')

    if (next.length === 4) {
      setChecking(true)
      try {
        if (!accountId) { setError('Not signed in'); setPin(''); setChecking(false); return }
        const hash = await hashPin(next)

        if (mode === 'login') {
          const match = staffCache.find(s => s.pinHash === hash && s.isActive)
          if (match) {
            setStaff({ id: match.id, name: `${match.firstName} ${match.lastName}`.trim(), role: match.role })
            navigate('/pos')
            return
          } else {
            setTimeout(() => { setPin(''); setError('Wrong PIN — try again'); setChecking(false) }, 300)
            return
          }
        }

        if (mode === 'reset-old-pin' && resetStaff) {
          // Verify old PIN
          if (hash === resetStaff.pinHash) {
            setPin(''); setError(''); setMode('reset-new-pin')
          } else {
            setTimeout(() => { setPin(''); setError('Wrong PIN — try again'); setChecking(false) }, 300)
            return
          }
        }

        if (mode === 'reset-new-pin') {
          setNewPin(next); setPin(''); setError(''); setMode('reset-confirm')
        }

        if (mode === 'reset-confirm') {
          if (next === newPin) {
            // Save new PIN
            if (accountId && resetStaff) {
              await updateDoc(doc(db, 'accounts', accountId, 'staff', resetStaff.id), { pinHash: hash })
              // Update local cache
              setStaffCache(prev => prev.map(s => s.id === resetStaff.id ? { ...s, pinHash: hash } : s))
            }
            setMode('reset-done')
          } else {
            setTimeout(() => { setPin(''); setError('PINs don\'t match — try again'); setMode('reset-new-pin'); setNewPin(''); setChecking(false) }, 300)
            return
          }
        }

      } catch {
        setPin(''); setError('Something went wrong')
      }
      setChecking(false)
    }
  }

  function handleDelete() { setPin(p => p.slice(0, -1)); setError('') }

  // ── Shared numpad ─────────────────────────────────────────────────────────
  function Numpad() {
    return (
      <div className="grid grid-cols-3 gap-3 w-64">
        {['1','2','3','4','5','6','7','8','9'].map(d => (
          <button key={d} onClick={() => handleKey(d)} disabled={checking}
            className="h-16 rounded-xl bg-white/10 text-white text-xl font-semibold hover:bg-white/20 active:bg-white/30 transition-colors disabled:opacity-50">
            {d}
          </button>
        ))}
        <div />
        <button onClick={() => handleKey('0')} disabled={checking}
          className="h-16 rounded-xl bg-white/10 text-white text-xl font-semibold hover:bg-white/20 active:bg-white/30 transition-colors disabled:opacity-50">
          0
        </button>
        <button onClick={handleDelete} disabled={checking}
          className="h-16 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20 active:bg-white/30 transition-colors">
          <Delete size={20} />
        </button>
      </div>
    )
  }

  function PinDots() {
    return (
      <div className="flex gap-3 mb-8">
        {[0,1,2,3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${i < pin.length ? 'bg-tan border-tan' : 'border-white/30'}`} />
        ))}
      </div>
    )
  }

  // ── LOGIN screen ──────────────────────────────────────────────────────────
  if (mode === 'login') return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <div className="bg-white rounded-2xl px-6 py-3 inline-block shadow-lg mb-3">
          <img src="/stitch-logo.png" alt="Stitch" className="h-10 object-contain" />
        </div>
        <p className="text-white/50 text-sm">Enter your PIN</p>
      </div>
      <PinDots />
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      <Numpad />
      <div className="mt-8 flex flex-col items-center gap-2">
        <button onClick={() => { setMode('reset-select'); setPin(''); setError('') }}
          className="text-white/40 text-xs hover:text-white/70 transition-colors">
          Set up / Reset PIN
        </button>
        <p className="text-white/30 text-xs">
          Business owner? <button onClick={() => signOut(auth).then(() => navigate('/login'))} className="text-tan hover:underline">Sign in here</button>
        </p>
      </div>
    </div>
  )

  // ── SELECT STAFF screen ───────────────────────────────────────────────────
  if (mode === 'reset-select') {
    const activeStaff = staffCache.filter(s => s.isActive).sort((a, b) => a.firstName.localeCompare(b.firstName))
    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-start pt-16 p-4">
        <button onClick={resetToLogin} className="self-start text-white/50 hover:text-white mb-6 flex items-center gap-1">
          <ArrowLeft size={16} /> <span className="text-sm">Back</span>
        </button>
        <div className="bg-white rounded-2xl px-6 py-3 inline-block shadow-lg mb-6">
          <img src="/stitch-logo.png" alt="Stitch" className="h-10 object-contain" />
        </div>
        <p className="text-white/70 text-sm mb-6">Who are you?</p>
        <div className="w-full max-w-xs flex flex-col gap-2">
          {activeStaff.map(s => (
            <button key={s.id}
              onClick={() => {
                setResetStaff(s)
                if (s.pinHash) {
                  setMode('reset-old-pin')
                } else {
                  setMode('reset-new-pin')
                }
                setPin(''); setError('')
              }}
              className="w-full py-3.5 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/20 active:bg-white/30 transition-colors">
              {s.firstName} {s.lastName}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── OLD PIN / NEW PIN / CONFIRM PIN screens ───────────────────────────────
  const headings: Record<Mode, string> = {
    'login': '',
    'reset-select': '',
    'reset-old-pin': `Hi ${resetStaff?.firstName} — enter your current PIN`,
    'reset-new-pin': 'Enter your new PIN',
    'reset-confirm': 'Confirm your new PIN',
    'reset-done': '',
  }

  if (mode === 'reset-done') return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-4 gap-5">
      <div className="bg-white rounded-2xl px-6 py-3 inline-block shadow-lg">
        <img src="/stitch-logo.png" alt="Stitch" className="h-10 object-contain" />
      </div>
      <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center">
        <Check size={28} className="text-white" />
      </div>
      <p className="text-white font-semibold text-lg">PIN updated!</p>
      <button onClick={resetToLogin}
        className="mt-2 px-8 py-3 rounded-xl bg-tan text-navy font-semibold text-sm hover:opacity-90 transition-opacity">
        Back to login
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-4">
      <button onClick={() => { setMode(mode === 'reset-old-pin' ? 'reset-select' : mode === 'reset-new-pin' && !resetStaff?.pinHash ? 'reset-select' : 'reset-old-pin'); setPin(''); setError('') }}
        className="absolute top-8 left-6 text-white/50 hover:text-white flex items-center gap-1">
        <ArrowLeft size={16} /> <span className="text-sm">Back</span>
      </button>
      <div className="text-center mb-8">
        <div className="bg-white rounded-2xl px-6 py-3 inline-block shadow-lg mb-3">
          <img src="/stitch-logo.png" alt="Stitch" className="h-10 object-contain" />
        </div>
        <p className="text-white/70 text-sm">{headings[mode]}</p>
      </div>
      <PinDots />
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      <Numpad />
    </div>
  )
}
