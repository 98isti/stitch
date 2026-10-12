import { useState, useEffect } from 'react'
import { doc, getDoc, getDocs, updateDoc, addDoc, deleteDoc, collection, query, limit, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Save, Check, Plus, Pencil, Trash2 } from 'lucide-react'
import SettingsPinGate from '../components/SettingsPinGate'
import { useLocations } from '../hooks/useLocations'

interface AccountProfile {
  businessName: string
  abn: string
  email: string
  phone: string
  plan: string
  shopType: 'alterations' | 'dryCleaning' | string
  sms: {
    senderName: string
    template: string
  }
  requirePinAfterLock: boolean
}

interface LocationProfile {
  name: string
  streetAddress: string
  suburb: string
  state: string
  country: string
  phone: string
  dailyTarget: number
  shopType: string
}

const DEFAULT_SMS_TEMPLATE = 'Hi {firstName}, your order at {businessName} is ready for pick-up! Order: {orderNumber}. {balance}'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</p>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {note && <p className="text-xs text-gray-400 mt-1">{note}</p>}
    </div>
  )
}

function Input({ value, onChange, type = 'text', placeholder }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy bg-white" />
  )
}

export default function SettingsPage() {
  const { accountId } = useAuth()
  const navigate = useNavigate()
  const [unlocked, setUnlocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testSmsSending, setTestSmsSending] = useState(false)
  const [testSmsResult, setTestSmsResult] = useState<'ok' | 'fail' | null>(null)

  const [profile, setProfile] = useState<AccountProfile>({
    businessName: '', abn: '', email: '', phone: '', plan: '',
    shopType: 'alterations',
    sms: { senderName: '+61419302345', template: DEFAULT_SMS_TEMPLATE },
    requirePinAfterLock: true,
  })

  const [location, setLocation] = useState<LocationProfile>({
    name: '', streetAddress: '', suburb: '', state: 'NSW',
    country: 'Australia', phone: '', dailyTarget: 500, shopType: 'alterations',
  })

  const [testPhone, setTestPhone] = useState('')

  const [locationId, setLocationId] = useState<string | null>(null)
  const { locations, activeLocation, setActiveLocation } = useLocations(unlocked ? accountId : null)

  // Inline location management
  const [allLocations, setAllLocations] = useState<{id:string;name:string;suburb:string;orderPrefix:string;dailyTarget:number;shopType:string;streetAddress:string;state:string;phone:string}[]>([])
  const [showLocSheet, setShowLocSheet] = useState(false)
  const [editingLoc, setEditingLoc] = useState<{id:string;name:string} | null>(null)
  const [locForm, setLocForm] = useState({ name:'', streetAddress:'', suburb:'', state:'NSW', phone:'', orderPrefix:'', shopType:'alterations', dailyTarget:'1000' })
  const [locSaving, setLocSaving] = useState(false)

  function fetchAllLocs() {
    if (!accountId) return
    getDocs(query(collection(db, 'accounts', accountId, 'locations'), orderBy('name')))
      .then(snap => setAllLocations(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))))
      .catch(() => {})
  }

  async function saveLocForm() {
    if (!accountId || !locForm.name.trim()) return
    setLocSaving(true)
    try {
      const data = { ...locForm, dailyTarget: parseFloat(locForm.dailyTarget) || 1000, orderPrefix: locForm.orderPrefix || locForm.name.slice(0,3).toUpperCase(), updatedAt: serverTimestamp() }
      if (editingLoc) {
        await updateDoc(doc(db, 'accounts', accountId, 'locations', editingLoc.id), data)
      } else {
        await addDoc(collection(db, 'accounts', accountId, 'locations'), { ...data, createdAt: serverTimestamp() })
      }
      setShowLocSheet(false)
      fetchAllLocs()
    } finally { setLocSaving(false) }
  }

  async function deleteLoc(id: string, name: string) {
    if (!accountId || !confirm(`Delete "${name}"?`)) return
    await deleteDoc(doc(db, 'accounts', accountId, 'locations', id))
    setAllLocations(prev => prev.filter(l => l.id !== id))
  }

  useEffect(() => {
    if (unlocked && accountId) fetchAllLocs()
  }, [unlocked, accountId])

  useEffect(() => {
    if (!accountId || !unlocked) return
    setLoading(true)

    Promise.all([
      getDoc(doc(db, 'accounts', accountId)),
      getDocs(query(collection(db, 'accounts', accountId, 'locations'), limit(1))),
    ]).then(([accSnap, locSnap]) => {
      if (accSnap.exists()) {
        const d = accSnap.data()
        setProfile({
          businessName: d.businessName ?? '',
          abn: d.abn ?? '',
          email: d.email ?? '',
          phone: d.phone ?? '',
          plan: d.plan ?? 'Trial',
          shopType: d.shopType ?? 'alterations',
          requirePinAfterLock: d.requirePinAfterLock !== false,
          sms: {
            senderName: d.sms?.senderName ?? '+61419302345',
            template: d.sms?.template ?? DEFAULT_SMS_TEMPLATE,
          },
        })
      }
      if (!locSnap.empty) {
        const locDoc = locSnap.docs[0]
        const l = locDoc.data()
        setLocationId(locDoc.id)
        setLocation({
          name: l.name ?? '',
          streetAddress: l.streetAddress ?? '',
          suburb: l.suburb ?? '',
          state: l.state ?? 'NSW',
          country: l.country ?? 'Australia',
          phone: l.phone ?? '',
          dailyTarget: l.dailyTarget ?? 500,
          shopType: l.shopType ?? 'alterations',
        })
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [accountId, unlocked])

  async function handleSave() {
    if (!accountId) return
    setSaving(true)
    try {
      // Save account profile
      await updateDoc(doc(db, 'accounts', accountId), {
        businessName: profile.businessName,
        abn: profile.abn,
        email: profile.email,
        phone: profile.phone,
        shopType: profile.shopType,
        sms: profile.sms,
        requirePinAfterLock: profile.requirePinAfterLock,
        updatedAt: serverTimestamp(),
      })
      // Save location to its subcollection doc
      if (locationId) {
        await updateDoc(doc(db, 'accounts', accountId, 'locations', locationId), {
          name: location.name,
          streetAddress: location.streetAddress,
          suburb: location.suburb,
          state: location.state,
          country: location.country,
          phone: location.phone,
          dailyTarget: location.dailyTarget,
          shopType: location.shopType,
          updatedAt: serverTimestamp(),
        })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  async function sendTestSms() {
    if (!testPhone || !accountId) return
    setTestSmsSending(true)
    setTestSmsResult(null)
    try {
      const res = await fetch('https://stitch-sms.supto98.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testPhone,
          senderName: profile.sms.senderName,
          template: profile.sms.template,
          firstName: 'Test',
          orderNumber: 'TEST-001',
          businessName: profile.businessName || 'Your Business',
          stillDueAmount: 0,
        })
      })
      setTestSmsResult(res.ok ? 'ok' : 'fail')
    } catch {
      setTestSmsResult('fail')
    } finally { setTestSmsSending(false) }
  }

  if (!unlocked) {
    return <SettingsPinGate accountId={accountId} onUnlocked={() => setUnlocked(true)} />
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/pos')} className="flex items-center gap-1 text-navy text-sm font-medium">
          <ChevronLeft size={18} /> Back
        </button>
        <h1 className="flex-1 text-center font-bold text-gray-900">Settings</h1>
        <button onClick={handleSave} disabled={saving || loading}
          className="flex items-center gap-1.5 text-navy text-sm font-semibold disabled:opacity-40">
          {saved ? <><Check size={14} className="text-green-500" /> Saved</> : <><Save size={14} /> Save</>}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-xl mx-auto space-y-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ── Active Location ── */}
              {locations.length > 0 && (
                <Section title="Active Location">
                  <Field label="Location" note="Controls which location's orders and revenue are shown in the POS.">
                    <select
                      value={activeLocation?.id ?? ''}
                      onChange={e => {
                        const loc = locations.find(l => l.id === e.target.value)
                        if (loc) setActiveLocation(loc)
                      }}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy bg-white font-medium text-gray-900">
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </Field>
                </Section>
              )}

              {/* ── Business Info ── */}
              <Section title="Business Information">
                <Field label="Business Name">
                  <Input value={profile.businessName} onChange={v => setProfile(p => ({ ...p, businessName: v }))} placeholder="Sew Smart Alterations" />
                </Field>
                <Field label="ABN">
                  <Input value={profile.abn} onChange={v => setProfile(p => ({ ...p, abn: v }))} placeholder="12 345 678 901" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Email">
                    <Input value={profile.email} onChange={v => setProfile(p => ({ ...p, email: v }))} type="email" placeholder="hello@business.com.au" />
                  </Field>
                  <Field label="Phone">
                    <Input value={profile.phone} onChange={v => setProfile(p => ({ ...p, phone: v }))} placeholder="02 1234 5678" />
                  </Field>
                </div>
                <Field label="Business Type">
                  <div className="grid grid-cols-2 gap-2">
                    {[['alterations', '✂️ Alterations'], ['dryCleaning', '👔 Dry Cleaning']].map(([val, label]) => (
                      <button key={val} onClick={() => setProfile(p => ({ ...p, shopType: val }))}
                        className={`py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                          profile.shopType === val ? 'border-navy bg-navy/5 text-navy' : 'border-gray-200 text-gray-600'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
              </Section>

              {/* ── Location Info ── */}
              <Section title="Location Details">
                <Field label="Location Name">
                  <Input value={location.name} onChange={v => setLocation(l => ({ ...l, name: v }))} placeholder="Carlingford" />
                </Field>
                <Field label="Street Address">
                  <Input value={location.streetAddress} onChange={v => setLocation(l => ({ ...l, streetAddress: v }))} placeholder="1 Smith Street" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Suburb">
                    <Input value={location.suburb} onChange={v => setLocation(l => ({ ...l, suburb: v }))} placeholder="Carlingford" />
                  </Field>
                  <Field label="State">
                    <select value={location.state} onChange={e => setLocation(l => ({ ...l, state: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy bg-white">
                      {['NSW','VIC','QLD','WA','SA','TAS','ACT','NT'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone">
                    <Input value={location.phone} onChange={v => setLocation(l => ({ ...l, phone: v }))} placeholder="02 1234 5678" />
                  </Field>
                  <Field label="Daily Sales Target ($)" note="Used for the revenue progress bar">
                    <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-navy">
                      <span className="text-gray-400 font-medium">$</span>
                      <input type="number" value={location.dailyTarget}
                        onChange={e => setLocation(l => ({ ...l, dailyTarget: parseFloat(e.target.value) || 0 }))}
                        className="flex-1 text-sm focus:outline-none bg-transparent" />
                    </div>
                  </Field>
                </div>
              </Section>

              {/* ── SMS Notifications ── */}
              <Section title="SMS Notifications">
                <Field label="Sender Name / Number"
                  note="Your business name (max 11 chars, must be registered) or a virtual AU number e.g. +61412345678">
                  <Input value={profile.sms.senderName}
                    onChange={v => setProfile(p => ({ ...p, sms: { ...p.sms, senderName: v } }))}
                    placeholder="+61412345678 or SewSmart" />
                </Field>
                <Field label="Message Template"
                  note="Variables: {firstName} {orderNumber} {businessName} {balance}">
                  <textarea
                    value={profile.sms.template}
                    onChange={e => setProfile(p => ({ ...p, sms: { ...p.sms, template: e.target.value } }))}
                    rows={4}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy resize-none" />
                </Field>
                <Field label="Send Test SMS">
                  <div className="flex gap-2">
                    <Input value={testPhone} onChange={setTestPhone} placeholder="0412 345 678" />
                    <button onClick={sendTestSms} disabled={testSmsSending || !testPhone}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors disabled:opacity-40 ${
                        testSmsResult === 'ok' ? 'bg-green-500 text-white' :
                        testSmsResult === 'fail' ? 'bg-red-500 text-white' :
                        'bg-navy text-white hover:bg-navy-light'
                      }`}>
                      {testSmsSending ? '…' : testSmsResult === 'ok' ? '✓ Sent' : testSmsResult === 'fail' ? '✗ Failed' : 'Send Test'}
                    </button>
                  </div>
                </Field>
              </Section>

              {/* ── Security ── */}
              <Section title="Security">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Require PIN after lock screen</p>
                    <p className="text-xs text-gray-400 mt-0.5">Staff must enter PIN when screen saver is dismissed</p>
                  </div>
                  <button
                    onClick={() => setProfile(p => ({ ...p, requirePinAfterLock: !p.requirePinAfterLock }))}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                      profile.requirePinAfterLock ? 'bg-navy' : 'bg-gray-200'
                    }`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      profile.requirePinAfterLock ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </Section>

              {/* ── Plan ── */}
              <Section title="Locations">
                <div className="space-y-2">
                  {allLocations.map(l => (
                    <div key={l.id} className="flex items-center gap-3 py-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{l.name}</p>
                          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{l.orderPrefix}</span>
                        </div>
                        {l.suburb && <p className="text-xs text-gray-400">{l.suburb}</p>}
                      </div>
                      <button onClick={() => { setEditingLoc({id:l.id,name:l.name}); setLocForm({name:l.name,streetAddress:l.streetAddress??'',suburb:l.suburb??'',state:l.state??'NSW',phone:l.phone??'',orderPrefix:l.orderPrefix??'',shopType:l.shopType??'alterations',dailyTarget:String(l.dailyTarget??1000)}); setShowLocSheet(true) }}
                        className="p-1.5 text-gray-400 hover:text-navy transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => deleteLoc(l.id, l.name)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <button onClick={() => { setEditingLoc(null); setLocForm({name:'',streetAddress:'',suburb:'',state:'NSW',phone:'',orderPrefix:'',shopType:'alterations',dailyTarget:'1000'}); setShowLocSheet(true) }}
                    className="flex items-center gap-1.5 text-navy text-sm font-medium mt-2 hover:opacity-70 transition-opacity">
                    <Plus size={15} /> Add Location
                  </button>
                </div>
              </Section>

              <Section title="Plan & Billing">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{profile.plan || 'Trial'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Manage billing via the Billing page</p>
                  </div>
                  <button onClick={() => navigate('/billing')}
                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors">
                    Billing →
                  </button>
                </div>
              </Section>

              {/* ── Location Sheet ── */}
              {showLocSheet && (
                <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowLocSheet(false)}>
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="relative z-10 bg-white rounded-t-3xl w-full max-w-sm pb-10 pt-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
                    <h3 className="text-center font-bold text-gray-900 mb-4 px-4">{editingLoc ? 'Edit Location' : 'Add Location'}</h3>
                    <div className="px-6 space-y-3">
                      {(['name','streetAddress','suburb','phone','orderPrefix'] as const).map(k => (
                        <div key={k}>
                          <label className="block text-xs text-gray-500 mb-1 capitalize">{k === 'orderPrefix' ? 'Order Prefix' : k === 'streetAddress' ? 'Street Address' : k.charAt(0).toUpperCase()+k.slice(1)}</label>
                          <input value={locForm[k]} onChange={e => setLocForm(f => ({...f,[k]:e.target.value}))}
                            placeholder={k === 'orderPrefix' ? 'e.g. CAR' : k === 'name' ? 'e.g. Carlingford' : ''}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Daily Target ($)</label>
                        <input type="number" value={locForm.dailyTarget} onChange={e => setLocForm(f => ({...f,dailyTarget:e.target.value}))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Shop Type</label>
                        <select value={locForm.shopType} onChange={e => setLocForm(f => ({...f,shopType:e.target.value}))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy bg-white">
                          <option value="alterations">Alterations</option>
                          <option value="dryCleaning">Dry Cleaning</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <button onClick={saveLocForm} disabled={!locForm.name.trim() || locSaving}
                        className="w-full py-3.5 rounded-xl bg-navy text-white font-semibold text-sm disabled:opacity-50 mt-2">
                        {locSaving ? 'Saving…' : editingLoc ? 'Save Changes' : 'Add Location'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Save ── */}
              <button onClick={handleSave} disabled={saving}
                className="w-full py-4 rounded-2xl bg-navy text-white font-bold text-base disabled:opacity-50 transition-colors hover:bg-navy-light">
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Settings'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
