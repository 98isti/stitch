import { useState } from 'react'
import { doc, setDoc, collection, addDoc } from 'firebase/firestore'
import { serverTimestamp } from 'firebase/firestore'
import { seedItemsForLocation } from '../lib/seedItemsForLocation'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

const STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']

interface FormData {
  // Step 0 — personal / account
  ownerFirstName: string
  ownerLastName:  string
  ownerPin:       string
  // Step 1 — shop / location
  shopName:     string   // saved as businessName on location doc
  shopNickname: string   // saved as name on location doc (defaults to shopName)
  abn:          string
  shopType:     'alterations' | 'dryCleaning' | ''
  phone:        string
  streetAddress: string
  suburb:       string
  state:        string
  dailyTarget:  string
}

const INITIAL: FormData = {
  ownerFirstName: '',
  ownerLastName:  '',
  ownerPin:       '',
  shopName:       '',
  shopNickname:   '',
  abn:            '',
  shopType:       '',
  phone:          '',
  streetAddress:  '',
  suburb:         '',
  state:          'NSW',
  dailyTarget:    '1000',
}

export default function OnboardingPage() {
  const { user } = useAuth()
  const [step, setStep]     = useState(0)
  const [form, setForm]     = useState<FormData>(INITIAL)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function canNext() {
    if (step === 0) {
      return form.ownerFirstName.trim().length > 0 && form.ownerPin.length === 4
    }
    if (step === 1) {
      return form.shopName.trim().length > 0 && form.phone.trim().length > 0 && form.shopType !== ''
    }
    return true
  }

  async function handleFinish() {
    if (!user) return
    setSaving(true)
    setError('')
    try {
      const accountId = user.uid

      // 1. Account doc — auth / plan layer only, no business data
      await setDoc(doc(db, 'accounts', accountId), {
        plan:       'trial',
        trialEndsAt: new Date(Date.now() + 14 * 86400000),
        email:      user.email,
        createdAt:  serverTimestamp(),
      })

      // 2. Owner staff record
      const ownerPinHash = await (async () => {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(form.ownerPin))
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
      })()
      await addDoc(collection(db, 'accounts', accountId, 'staff'), {
        firstName:  form.ownerFirstName.trim(),
        lastName:   form.ownerLastName.trim(),
        pinHash:    ownerPinHash,
        role:       'Owner',
        payRate:    0,
        isActive:   true,
        createdAt:  serverTimestamp(),
      })

      // 3. First location — ALL business data lives here
      const locationName = form.shopNickname.trim() || form.shopName.trim()
      const newLocRef = await addDoc(collection(db, 'accounts', accountId, 'locations'), {
        businessName:  form.shopName.trim(),
        name:          locationName,
        abn:           form.abn.trim(),
        shopType:      form.shopType,
        phone:         form.phone.trim(),
        streetAddress: form.streetAddress.trim(),
        suburb:        form.suburb.trim(),
        state:         form.state,
        country:       'Australia',
        dailyTarget:   parseFloat(form.dailyTarget) || 1000,
        orderPrefix:   locationName.slice(0, 3).toUpperCase(),
        createdAt:     serverTimestamp(),
      })

      // 4. Seed categories + items from Firestore template for this location
      await seedItemsForLocation(accountId, newLocRef.id, form.shopType as 'alterations' | 'dryCleaning', locationName)

      // 5. Mark user as onboarded
      await setDoc(doc(db, 'users', accountId), {
        accountId,
        email:     user.email,
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
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/stitch-logo.png" alt="Stitch" className="h-10 object-contain brightness-0 invert mx-auto" />
        </div>

        {/* Step dots */}
        {step < 2 && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {[0, 1].map(i => (
              <div key={i} className={`rounded-full transition-all duration-300 ${
                i === step ? 'w-6 h-2 bg-tan' : i < step ? 'w-2 h-2 bg-tan/60' : 'w-2 h-2 bg-white/30'
              }`} />
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* ── Step 0: Your account ──────────────────────────────── */}
          {step === 0 && (
            <div className="p-7">
              <h2 className="font-bold text-navy text-xl mb-1">Welcome to Stitch</h2>
              <p className="text-sm text-gray-500 mb-6">Let's start with your owner account</p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      First Name <span className="text-red-400">*</span>
                    </label>
                    <input type="text" value={form.ownerFirstName}
                      onChange={e => set('ownerFirstName', e.target.value)}
                      placeholder="Isti"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                    <input type="text" value={form.ownerLastName}
                      onChange={e => set('ownerLastName', e.target.value)}
                      placeholder="Islam"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Owner PIN <span className="text-red-400">*</span>
                  </label>
                  <input type="password" inputMode="numeric" maxLength={4}
                    value={form.ownerPin}
                    onChange={e => set('ownerPin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy tracking-[0.5em] text-center text-xl" />
                  <p className="text-xs text-gray-400 mt-1.5 text-center">4 digits — used for Settings and admin access</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Your shop ─────────────────────────────────── */}
          {step === 1 && (
            <div className="p-7">
              <h2 className="font-bold text-navy text-xl mb-1">Your shop</h2>
              <p className="text-sm text-gray-500 mb-6">Tell us about your business</p>

              <div className="space-y-4">
                {/* Shop type — pick first, affects everything */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shop type <span className="text-red-400">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['alterations', 'dryCleaning'] as const).map(type => (
                      <button key={type} type="button"
                        onClick={() => set('shopType', type)}
                        className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                          form.shopType === type
                            ? 'border-navy bg-navy text-white'
                            : form.shopType === ''
                              ? 'border-red-300 text-gray-600 hover:border-navy/30'
                              : 'border-gray-200 text-gray-600 hover:border-navy/30'
                        }`}>
                        {type === 'alterations' ? '✂️  Alterations' : '👔  Dry Cleaning'}
                      </button>
                    ))}
                  </div>
                  {form.shopType === '' && <p className="text-xs text-red-400 mt-1">Please select a shop type</p>}
                </div>

                {/* Shop name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Shop name <span className="text-red-400">*</span>
                  </label>
                  <input type="text" value={form.shopName}
                    onChange={e => set('shopName', e.target.value)}
                    placeholder="e.g. Your Business Name"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy" />
                </div>

                {/* ABN */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    ABN <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input type="text" value={form.abn}
                    onChange={e => set('abn', e.target.value)}
                    placeholder="e.g. 12 345 678 901"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy" />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone <span className="text-red-400">*</span>
                  </label>
                  <input type="tel" value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    placeholder="e.g. 02 9123 4567"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy" />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                  <input type="text" value={form.streetAddress}
                    onChange={e => set('streetAddress', e.target.value)}
                    placeholder="e.g. Shop 12, Westfield Eastgardens"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy" />
                </div>

                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Suburb</label>
                    <input type="text" value={form.suburb}
                      onChange={e => set('suburb', e.target.value)}
                      placeholder="Eastgardens"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                    <select value={form.state} onChange={e => set('state', e.target.value)}
                      className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy bg-white">
                      {STATES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Daily target */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Daily sales target <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 focus-within:border-navy focus-within:ring-2 focus-within:ring-navy/20">
                    <span className="text-gray-400">$</span>
                    <input type="number" value={form.dailyTarget}
                      onChange={e => set('dailyTarget', e.target.value)}
                      placeholder="1000" inputMode="numeric"
                      className="flex-1 bg-transparent text-sm text-gray-900 focus:outline-none" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Shows as a daily progress bar on the POS</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Done ──────────────────────────────────────── */}
          {step === 2 && (
            <div className="p-10 text-center">
              <div className="text-6xl mb-5">🎉</div>
              <h2 className="font-bold text-navy text-2xl mb-2">You're all set!</h2>
              <p className="text-sm text-gray-500 mb-1">Your shop has been created.</p>
              <p className="text-sm text-gray-500 mb-8">
                We've loaded services and prices as a starting point — edit them anytime in Settings.
              </p>
              <button onClick={() => window.location.reload()}
                className="w-full bg-navy text-white py-3.5 rounded-xl font-semibold hover:bg-navy/90 transition-colors text-sm">
                Open Stitch →
              </button>
            </div>
          )}

          {/* Footer nav */}
          {step < 2 && (
            <div className="px-7 pb-7 flex flex-col gap-3">
              {error && (
                <p className="text-red-500 text-xs text-center">{error}</p>
              )}
              <div className="flex gap-3">
                {step > 0 && (
                  <button onClick={() => setStep(s => s - 1)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
                    ← Back
                  </button>
                )}
                {step < 1 ? (
                  <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                    className="flex-1 py-3 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy/90 disabled:opacity-40 transition-colors">
                    Next →
                  </button>
                ) : (
                  <button onClick={handleFinish} disabled={!canNext() || saving}
                    className="flex-1 py-3 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy/90 disabled:opacity-40 transition-colors">
                    {saving ? 'Setting up…' : 'Create my shop →'}
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        <p className="text-center text-white/30 text-xs mt-6">Stitch POS · stitch.com.au</p>
      </div>
    </div>
  )
}
