import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth'
import { auth } from '../lib/firebase'

export default function SignUpPage() {
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const navigate                    = useNavigate()

  function validate() {
    if (!email.trim()) return 'Please enter your email'
    if (password.length < 8) return 'Password must be at least 8 characters'
    if (password !== confirm) return 'Passwords do not match'
    return null
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true)
    setError('')
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password)
      // Send verification email in background — don't block the flow
      sendEmailVerification(user).catch(() => {})
      // AuthContext will detect the new user + not-onboarded → redirect to /onboarding automatically
    } catch (e: unknown) {
      const code = (e as { code?: string }).code
      if (code === 'auth/email-already-in-use') setError('An account with this email already exists')
      else if (code === 'auth/invalid-email') setError('Please enter a valid email address')
      else if (code === 'auth/weak-password') setError('Password must be at least 8 characters')
      else setError('Something went wrong — please try again')
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
          <h1 className="text-navy font-semibold text-lg mb-1">Create your account</h1>
          <p className="text-sm text-gray-400 mb-6">14-day free trial — no credit card required</p>

          <form onSubmit={handleSignUp} className="space-y-4">
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
                placeholder="Min. 8 characters"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy text-sm ${
                  confirm && confirm !== password ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder="••••••••"
                required
              />
              {confirm && confirm !== password && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-navy text-white py-2.5 rounded-lg font-medium text-sm hover:bg-navy/90 transition-colors disabled:opacity-50 mt-2">
              {loading ? 'Creating account…' : 'Create account →'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="text-navy font-semibold hover:underline">Sign in</button>
          </p>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">Stitch POS · stitchapp.com.au</p>
      </div>
    </div>
  )
}
