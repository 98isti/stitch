import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../lib/firebase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch {
      setError('Invalid email or password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/stitch-logo.png" alt="Stitch" className="h-16 object-contain mx-auto brightness-0 invert" />
          <p className="text-white/50 text-sm mt-3">Alterations & Tailoring POS</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <h1 className="text-navy font-semibold text-lg mb-6">Sign in to your account</h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy text-sm"
                placeholder="you@yourbusiness.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy text-sm"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-navy text-white py-2.5 rounded-lg font-medium text-sm hover:bg-navy-light transition-colors disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Need an account?{' '}
            <a href="#" className="text-navy font-medium hover:underline">Start free trial</a>
          </p>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          Are you staff? Ask your manager to sign you in.
        </p>
      </div>
    </div>
  )
}
