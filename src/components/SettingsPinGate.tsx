import { useState } from 'react'
import { Delete, ChevronLeft } from 'lucide-react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useNavigate } from 'react-router-dom'

interface Props { accountId: string | null; onUnlocked: () => void }

async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function SettingsPinGate({ accountId, onUnlocked }: Props) {
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

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
        const snap = await getDocs(collection(db, 'accounts', accountId, 'staff'))
        const match = snap.docs
          .map(d => d.data())
          .find(s => s.pinHash === hash && s.isActive && ['Manager', 'Owner'].includes(s.role))

        if (match) {
          onUnlocked()
        } else {
          setTimeout(() => { setPin(''); setError('Manager or Owner PIN required'); setChecking(false) }, 300)
          return
        }
      } catch {
        setPin(''); setError('Error checking PIN')
      }
      setChecking(false)
    }
  }

  function handleDelete() { setPin(p => p.slice(0, -1)); setError('') }

  const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div className="flex flex-col h-full bg-navy">
      <div className="px-4 pt-4">
        <button onClick={() => navigate('/pos')} className="flex items-center gap-1 text-white/60 hover:text-white text-sm transition-colors">
          <ChevronLeft size={18} /> Back
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚙️</span>
          </div>
          <h2 className="text-white text-xl font-bold">Settings</h2>
          <p className="text-white/50 text-sm mt-1">Enter Manager or Owner PIN</p>
        </div>

        {/* PIN dots */}
        <div className="flex gap-4 mb-8">
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full transition-all duration-150 ${
              i < pin.length ? 'bg-white scale-110' : 'bg-white/25'
            }`} />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-400 text-sm mb-6 text-center">{error}</p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
          {KEYS.map((k, i) => {
            if (k === '') return <div key={i} />
            if (k === '⌫') return (
              <button key={i} onClick={handleDelete}
                className="h-16 rounded-2xl bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors">
                <Delete size={20} className="text-white" />
              </button>
            )
            return (
              <button key={i} onClick={() => handleKey(k)}
                className="h-16 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-2xl font-semibold transition-colors">
                {k}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
