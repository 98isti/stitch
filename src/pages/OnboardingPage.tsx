import { useState } from 'react'
import { doc, setDoc, collection, addDoc } from 'firebase/firestore'
import { serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

const STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']
const COUNTRIES = ['Australia', 'New Zealand', 'United Kingdom', 'United States', 'Other']

interface FormData {
  companyName: string
  abn: string
  locationName: string
  streetAddress: string
  suburb: string
  state: string
  country: string
  phone: string
  shopType: 'alterations' | 'dryCleaning'
}

const INITIAL: FormData = {
  companyName: '',
  abn: '',
  locationName: '',
  streetAddress: '',
  suburb: '',
  state: 'NSW',
  country: 'Australia',
  phone: '',
  shopType: 'alterations',
}

const STEPS = ['Business', 'Location', 'Done']

export default function OnboardingPage() {
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function canNext() {
    if (step === 0) return form.companyName.trim().length > 0
    if (step === 1) return form.locationName.trim().length > 0 && form.phone.trim().length > 0
    return true
  }

  async function handleFinish() {
    if (!user) return
    setSaving(true)
    setError('')
    try {
      const accountId = user.uid

      // 1. Create account profile
      await setDoc(doc(db, 'accounts', accountId), {
        businessName: form.companyName.trim(),
        abn: form.abn.trim(),
        email: user.email,
        plan: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 86400000),
        createdAt: serverTimestamp(),
        templateApplied: 'sewSmart',
      })

      // 2. Create first location
      await addDoc(collection(db, 'accounts', accountId, 'locations'), {
        name: form.locationName.trim(),
        streetAddress: form.streetAddress.trim(),
        suburb: form.suburb.trim(),
        state: form.state,
        country: form.country,
        phone: form.phone.trim(),
        shopType: form.shopType,
        createdAt: serverTimestamp(),
      })

      // 3. Copy default template (categories + items)
      const { getDocs, collection: col, doc: docRef, setDoc: set } = await import('firebase/firestore')
      const catSnap = await getDocs(col(db, 'defaults', 'sewSmart', 'categories'))
      for (const d of catSnap.docs) {
        await set(docRef(db, 'accounts', accountId, 'categories', d.id), { ...d.data(), source: 'default' })
      }

      const itemSnap = await getDocs(col(db, 'defaults', 'sewSmart', 'items'))
      for (const d of itemSnap.docs) {
        await set(docRef(db, 'accounts', accountId, 'items', d.id), { ...d.data(), source: 'default' })
      }

      // 4. Mark user profile
      await setDoc(doc(db, 'users', accountId), {
        accountId,
        email: user.email,
        onboarded: true,
        createdAt: serverTimestamp(),
      })

      setStep(2)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="w-10 h-10 bg-tan rounded-lg flex items-center justify-center">
              <span className="text-navy font-bold text-xl">S</span>
            </div>
            <span className="text-white text-2xl font-bold">Stitch</span>
          </div>
        </div>

        {/* Progress */}
        {step < 2 && (
          <div className="flex items-center gap-2 mb-6 px-2">
            {STEPS.slice(0, 2).map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  i <= step ? 'bg-tan text-navy' : 'bg-white/20 text-white/40'
                }`}>{i + 1}</div>
                <span className={`text-xs font-medium transition-colors ${i <= step ? 'text-white' : 'text-white/40'}`}>{s}</span>
                {i < 1 && <div className={`flex-1 h-0.5 rounded ${i < step ? 'bg-tan' : 'bg-white/20'}`} />}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Step 0 — Business info */}
          {step === 0 && (
            <div className="p-6">
              <h2 className="font-bold text-navy text-lg mb-1">Business details</h2>
              <p className="text-sm text-gray-500 mb-5">Tell us about your business</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name <span className="text-red-400">*</span></label>
                  <input type="text" value={form.companyName} onChange={e => set('companyName', e.target.value)}
                    placeholder="e.g. Sew Smart Alterations"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ABN <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="text" value={form.abn} onChange={e => set('abn', e.target.value)}
                    placeholder="e.g. 12 345 678 901"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy" />
                </div>
              </div>
            </div>
          )}

          {/* Step 1 — Location info */}
          {step === 1 && (
            <div className="p-6">
              <h2 className="font-bold text-navy text-lg mb-1">Your first location</h2>
              <p className="text-sm text-gray-500 mb-5">You can add more locations later</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location Name <span className="text-red-400">*</span></label>
                  <input type="text" value={form.locationName} onChange={e => set('locationName', e.target.value)}
                    placeholder="e.g. Eastgardens, Sydney CBD"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                  <input type="text" value={form.streetAddress} onChange={e => set('streetAddress', e.target.value)}
                    placeholder="e.g. Shop 12, 152 Bunnerong Road"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Suburb / City</label>
                    <input type="text" value={form.suburb} onChange={e => set('suburb', e.target.value)}
                      placeholder="e.g. Eastgardens"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <select value={form.state} onChange={e => set('state', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy bg-white">
                      {STATES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select value={form.country} onChange={e => set('country', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy bg-white">
                    {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-red-400">*</span></label>
                  <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="e.g. 02 9123 4567"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shop Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['alterations', 'dryCleaning'] as const).map(type => (
                      <button key={type} onClick={() => set('shopType', type)}
                        className={`py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                          form.shopType === type
                            ? 'border-navy bg-navy text-white'
                            : 'border-gray-200 text-gray-600 hover:border-navy/40'
                        }`}>
                        {type === 'alterations' ? '✂️ Alterations' : '👔 Dry Cleaning'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Done */}
          {step === 2 && (
            <div className="p-8 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="font-bold text-navy text-xl mb-2">You're all set!</h2>
              <p className="text-sm text-gray-500 mb-1">Your account has been created.</p>
              <p className="text-sm text-gray-500 mb-6">
                We've loaded <strong>256 services</strong> and prices as a starting point — edit them anytime.
              </p>
              <button onClick={() => window.location.reload()}
                className="w-full bg-navy text-white py-3 rounded-xl font-semibold hover:bg-navy-light transition-colors">
                Open Stitch →
              </button>
            </div>
          )}

          {/* Footer buttons */}
          {step < 2 && (
            <div className="px-6 pb-6 flex gap-3">
              {step > 0 && (
                <button onClick={() => setStep(s => s - 1)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
                  Back
                </button>
              )}
              {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
              {step < 1 ? (
                <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                  className="flex-1 py-2.5 rounded-lg bg-navy text-white text-sm font-semibold hover:bg-navy-light disabled:opacity-40 transition-colors">
                  Next →
                </button>
              ) : (
                <button onClick={handleFinish} disabled={!canNext() || saving}
                  className="flex-1 py-2.5 rounded-lg bg-navy text-white text-sm font-semibold hover:bg-navy-light disabled:opacity-40 transition-colors">
                  {saving ? 'Setting up...' : 'Finish →'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
