import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, CheckCircle, CreditCard, Zap } from 'lucide-react'

const STRIPE_CHECKOUT_URL = 'https://buy.stripe.com/stitch_placeholder' // replace with real link

interface Profile { businessName: string; plan: string; trialEndsAt?: string; stripeCustomerId?: string }

export default function BillingPage() {
  const { accountId } = useAuth()
  const { locations } = useLocations(accountId)
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accountId) return
    getDoc(doc(db, 'accounts', accountId, 'profile', 'main'))
      .then(snap => {
        if (snap.exists()) setProfile(snap.data() as Profile)
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [accountId])

  const locationCount = locations.length
  const monthlyTotal = locationCount * 99

  const trialDaysLeft = (() => {
    if (!profile?.trialEndsAt) return null
    const end = new Date(profile.trialEndsAt)
    const diff = Math.ceil((end.getTime() - Date.now()) / 86400000)
    return diff
  })()

  const isPaid = profile?.plan === 'paid' || profile?.plan === 'pro'

  function handleCheckout() {
    const url = new URL(STRIPE_CHECKOUT_URL)
    url.searchParams.set('client_reference_id', accountId ?? '')
    window.open(url.toString(), '_blank')
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/settings')} className="flex items-center gap-1 text-navy text-sm font-medium"><ChevronLeft size={18} /> Settings</button>
        <h1 className="flex-1 text-center font-bold text-gray-900">Billing</h1>
        <div className="w-16" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full space-y-4">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            {/* Status banner */}
            {isPaid ? (
              <div className="bg-green-50 rounded-2xl p-5 border border-green-200 flex items-center gap-4">
                <CheckCircle size={32} className="text-green-600 shrink-0" />
                <div>
                  <p className="font-bold text-green-800">Active Subscription</p>
                  <p className="text-sm text-green-600 mt-0.5">{locationCount} location{locationCount !== 1 ? 's' : ''} · ${monthlyTotal}/month</p>
                </div>
              </div>
            ) : (
              <div className={`rounded-2xl p-5 border ${trialDaysLeft !== null && trialDaysLeft <= 3 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <Zap size={20} className={trialDaysLeft !== null && trialDaysLeft <= 3 ? 'text-red-500' : 'text-amber-500'} />
                  <p className="font-bold text-gray-900">
                    {trialDaysLeft !== null
                      ? trialDaysLeft > 0 ? `Trial — ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left`
                      : 'Trial Expired'
                      : 'Free Trial'}
                  </p>
                </div>
                <p className="text-sm text-gray-600">Subscribe to keep access to all features.</p>
              </div>
            )}

            {/* Pricing */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">Stitch POS</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Per location</span>
                  <span className="font-bold text-gray-900">$99 / month</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Your locations</span>
                  <span className="font-semibold text-gray-900">{locationCount}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-navy">${monthlyTotal} / month</span>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">What's included</h3>
              <ul className="space-y-2">
                {[
                  'Unlimited orders',
                  'All locations & staff',
                  'Customer database',
                  'Firestore real-time sync',
                  'Gift vouchers',
                  'Reports & analytics',
                  'Email support',
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle size={15} className="text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {!isPaid && (
              <button onClick={handleCheckout}
                className="w-full py-4 rounded-2xl bg-navy text-white font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all">
                <CreditCard size={20} />
                Subscribe — ${monthlyTotal}/month
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
