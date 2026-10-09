import { useState } from 'react'
import { Delete } from 'lucide-react'
import { collection, getDocs, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useStaff } from '../context/StaffContext'
import { useNavigate } from 'react-router-dom'

interface StaffMember { id: string; firstName: string; lastName: string; pinHash: string; role: string; isActive: boolean }

async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function StaffPinPage() {
  const { accountId } = useAuth()
  const { setStaff } = useStaff()
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
        const snap = await getDocs(query(collection(db, 'accounts', accountId, 'staff')))
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember))
        const match = all.find(s => s.pinHash === hash && s.isActive)
        if (match) {
          setStaff({ id: match.id, name: `${match.firstName} ${match.lastName}`, role: match.role })
          navigate('/pos')
          return
        } else {
          setTimeout(() => { setPin(''); setError('Wrong PIN — try again'); setChecking(false) }, 300)
          return
        }
      } catch {
        setPin(''); setError('Error checking PIN'); 
      }
      setChecking(false)
    }
  }

  function handleDelete() { setPin(p => p.slice(0, -1)); setError('') }

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-tan rounded-lg flex items-center justify-center">
            <span className="text-navy font-bold">S</span>
          </div>
          <span className="text-white text-xl font-bold">Stitch</span>
        </div>
        <p className="text-white/50 text-sm">Enter your PIN</p>
      </div>

      <div className="flex gap-3 mb-8">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${i < pin.length ? 'bg-tan border-tan' : 'border-white/30'}`} />
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-3 w-64">
        {['1','2','3','4','5','6','7','8','9'].map(d => (
          <button key={d} onClick={() => handleKey(d)}
            className="h-16 rounded-xl bg-white/10 text-white text-xl font-semibold hover:bg-white/20 active:bg-white/30 transition-colors disabled:opacity-50"
            disabled={checking}>
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

      <p className="text-white/30 text-xs mt-8">
        Business owner? <a href="/login" className="text-tan hover:underline">Sign in here</a>
      </p>
    </div>
  )
}
