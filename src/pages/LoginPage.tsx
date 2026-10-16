import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../lib/firebase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Please enter your email address'); return }
    setResetLoading(true)
    setError('')
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setResetSent(true)
    } catch {
      setError('Could not send reset email — check the address and try again')
    } finally { setResetLoading(false) }
  }

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
          <div className="bg-white rounded-2xl px-8 py-4 inline-block shadow-xl mb-1">
            <img src="/stitch-logo.png" alt="Stitch" className="h-12 object-contain" />
          </div>
          <p className="text-white/50 text-sm mt-3">Alterations & Dry Cleaning POS</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <h1 className="text-navy font-semibold text-lg mb-6">
            {resetMode ? 'Reset your password' : 'Sign in to your account'}
          </h1>

          {/* ── Reset sent confirmation ── */}
          {resetSent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">📧</div>
              <p className="text-sm text-gray-700 font-medium mb-1">Check your email</p>
              <p className="text-xs text-gray-400 mb-6">We sent a password reset link to <strong>{email}</strong></p>
              <button onClick={() => { setResetMode(false); setResetSent(false) }}
                className="text-navy text-sm font-semibold hover:underline">← Back to sign in</button>
            </div>
          ) : resetMode ? (
            /* ── Reset password form ── */
            <form onSubmit={handleReset} className="space-y-4">
              <p className="text-sm text-gray-500">Enter your email and we'll send you a reset link.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy text-sm"
                  placeholder="you@yourbusiness.com" required />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button type="submit" disabled={resetLoading}
                className="w-full bg-navy text-white py-2.5 rounded-lg font-medium text-sm hover:bg-navy/90 transition-colors disabled:opacity-50">
                {resetLoading ? 'Sending…' : 'Send reset link'}
              </button>
              <button type="button" onClick={() => { setResetMode(false); setError('') }}
                className="w-full text-gray-400 text-sm hover:text-gray-600">
                ← Back to sign in
              </button>
            </form>
          ) : (
            /* ── Sign in form ── */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy text-sm"
                  placeholder="you@yourbusiness.com" required />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <button type="button" onClick={() => { setResetMode(true); setError('') }}
                    className="text-xs text-navy hover:underline">Forgot password?</button>
                </div>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy text-sm"
                  placeholder="••••••••" required />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-navy text-white py-2.5 rounded-lg font-medium text-sm hover:bg-navy-light transition-colors disabled:opacity-50">
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}

          {!resetMode && !resetSent && (
            <p className="text-center text-xs text-gray-400 mt-6">
              Need an account?{' '}
              <button onClick={() => navigate('/signup')} className="text-navy font-semibold hover:underline">Start free trial</button>
            </p>
          )}
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          Are you staff? Ask your manager to sign you in.
        </p>
      </div>
    </div>
  )
}
