import { useState, useEffect } from 'react'
import { doc, getDoc, getDocs, updateDoc, addDoc, deleteDoc, collection, query, orderBy, where, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useIsManagement } from '../context/ManagementContext'
import { ChevronLeft, Save, Check, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'
import SettingsPinGate from '../components/SettingsPinGate'
import PrinterSettings from '../components/PrinterSettings'
import { useLocations } from '../hooks/useLocations'
import { seedItemsForLocation } from '../lib/seedItemsForLocation'

const DEFAULT_SMS_TEMPLATE = 'Hi {firstName}, your order at {businessName} is ready for pick-up! Order: {orderNumber}. {balance}'

// ── Shared UI helpers ────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
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

// ── Types ────────────────────────────────────────────────────────────────────

interface LocationSettings {
  name: string
  businessName: string
  abn: string
  businessEmail: string
  shopNumber: string
  shoppingCentre: string
  streetAddress: string
  suburb: string
  state: string
  postCode: string
  country: string
  phone: string
  dailyTarget: number
  shopType: string
  orderPrefix: string
  sms: { senderName: string; template: string }
}

const BLANK_LOCATION: LocationSettings = {
  name: '', businessName: '', abn: '', businessEmail: '',
  shopNumber: '', shoppingCentre: '', streetAddress: '', suburb: '',
  state: 'NSW', postCode: '', country: 'Australia',
  phone: '', dailyTarget: 1000, shopType: '', orderPrefix: '',
  sms: { senderName: '', template: DEFAULT_SMS_TEMPLATE },
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { accountId } = useAuth()
  const navigate = useNavigate()
  const [unlocked, setUnlocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testSmsSending, setTestSmsSending] = useState(false)
  const [testSmsResult, setTestSmsResult] = useState<'ok' | 'fail' | null>(null)
  const [testPhone, setTestPhone] = useState('')

  // Account-level settings
  const [requirePinAfterLock, setRequirePinAfterLock] = useState(true)
  const [plan, setPlan] = useState('Trial')

  // Per-location settings
  const [locSettings, setLocSettings] = useState<LocationSettings>(BLANK_LOCATION)

  const { locations, activeLocation, setActiveLocation } = useLocations(unlocked ? accountId : null)

  // Location management
  const [allLocations, setAllLocations] = useState<any[]>([])
  const [showLocSheet, setShowLocSheet] = useState(false)
  const [editingLoc, setEditingLoc] = useState<{ id: string; name: string } | null>(null)
  const [locForm, setLocForm] = useState({ name: '', businessName: '', abn: '', businessEmail: '', shopNumber: '', shoppingCentre: '', streetAddress: '', suburb: '', state: 'NSW', postCode: '', phone: '', orderPrefix: '', shopType: '', dailyTarget: '1000' })
  const [locSaving, setLocSaving] = useState(false)

  // ── Load account-level data once ──────────────────────────────────────────
  useEffect(() => {
    if (!accountId || !unlocked) return
    setLoading(true)
    getDoc(doc(db, 'accounts', accountId)).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        setRequirePinAfterLock(d.requirePinAfterLock !== false)
        setPlan(d.plan ?? 'Trial')
      }
      setLoading(false)
    }).catch(() => setLoading(false))
    fetchAllLocs()
  }, [accountId, unlocked])

  // ── Reload location form when active location changes ─────────────────────
  useEffect(() => {
    if (!accountId || !activeLocation) return
    getDoc(doc(db, 'accounts', accountId, 'locations', activeLocation.id)).then(snap => {
      if (!snap.exists()) return
      const d = snap.data()
      setLocSettings({
        name:           d.name           ?? '',
        businessName:   d.businessName   ?? '',
        abn:            d.abn            ?? '',
        businessEmail:  d.businessEmail  ?? '',
        shopNumber:     d.shopNumber     ?? '',
        shoppingCentre: d.shoppingCentre ?? '',
        streetAddress:  d.streetAddress  ?? '',
        suburb:         d.suburb         ?? '',
        state:          d.state          ?? 'NSW',
        postCode:       d.postCode       ?? '',
        country:        d.country        ?? 'Australia',
        phone:          d.phone          ?? '',
        dailyTarget:    d.dailyTarget    ?? 1000,
        shopType:       d.shopType       ?? 'alterations',
        orderPrefix:    d.orderPrefix    ?? '',
        sms: {
          senderName: d.sms?.senderName ?? '',
          template:   d.sms?.template   ?? DEFAULT_SMS_TEMPLATE,
        },
      })
    })
  }, [activeLocation?.id, accountId])

  // ── Location management ───────────────────────────────────────────────────
  function fetchAllLocs() {
    if (!accountId) return
    getDocs(query(collection(db, 'accounts', accountId, 'locations'), orderBy('name')))
      .then(snap => setAllLocations(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {})
  }

  async function saveLocForm() {
    if (!accountId || !locForm.name.trim()) return
    setLocSaving(true)
    try {
      const data = {
        name:           locForm.name,
        businessName:   locForm.businessName,
        abn:            locForm.abn,
        businessEmail:  locForm.businessEmail,
        shopNumber:     locForm.shopNumber,
        shoppingCentre: locForm.shoppingCentre,
        streetAddress:  locForm.streetAddress,
        suburb:         locForm.suburb,
        state:          locForm.state,
        postCode:       locForm.postCode,
        phone:          locForm.phone,
        orderPrefix:    locForm.orderPrefix || locForm.name.slice(0, 3).toUpperCase(),
        shopType:       locForm.shopType,
        dailyTarget:    parseFloat(locForm.dailyTarget) || 1000,
        updatedAt:      serverTimestamp(),
      }
      if (editingLoc) {
        await updateDoc(doc(db, 'accounts', accountId, 'locations', editingLoc.id), data)
      } else {
        const newLocRef = await addDoc(collection(db, 'accounts', accountId, 'locations'), { ...data, createdAt: serverTimestamp() })
        const shopType = (data.shopType || 'alterations') as 'alterations' | 'dryCleaning'
        await seedItemsForLocation(accountId, newLocRef.id, shopType, data.name)
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

  async function reseedLoc(id: string, shopType: string, name: string) {
    if (!accountId || !confirm(`Reseed items for "${name}" from template? This will delete existing items and reload from the template.`)) return
    setLocSaving(true)
    try {
      // Delete existing items + categories for this location
      const [itemsSnap, catsSnap] = await Promise.all([
        getDocs(query(collection(db, 'accounts', accountId, 'items'), where('locationId', '==', id))),
        getDocs(query(collection(db, 'accounts', accountId, 'categories'), where('locationId', '==', id))),
      ])
      await Promise.all([
        ...itemsSnap.docs.map(d => deleteDoc(d.ref)),
        ...catsSnap.docs.map(d => deleteDoc(d.ref)),
      ])
      // Reseed from template
      await seedItemsForLocation(accountId, id, shopType as 'alterations' | 'dryCleaning')
      alert(`✅ Reseeded ${name} successfully`)
    } catch (e) {
      alert('Reseed failed: ' + (e as Error).message)
    } finally { setLocSaving(false) }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!accountId || !activeLocation) return
    setSaving(true)
    try {
      // All info → location doc (including business details)
      await updateDoc(doc(db, 'accounts', accountId, 'locations', activeLocation.id), {
        name:           locSettings.name,
        businessName:   locSettings.businessName,
        abn:            locSettings.abn,
        businessEmail:  locSettings.businessEmail,
        shopNumber:     locSettings.shopNumber,
        shoppingCentre: locSettings.shoppingCentre,
        streetAddress:  locSettings.streetAddress,
        suburb:         locSettings.suburb,
        state:          locSettings.state,
        postCode:       locSettings.postCode,
        country:        locSettings.country,
        phone:          locSettings.phone,
        dailyTarget:    locSettings.dailyTarget,
        shopType:       locSettings.shopType,
        orderPrefix:    locSettings.orderPrefix,
        sms:            locSettings.sms,
        updatedAt:      serverTimestamp(),
      })
      // Account doc — security
      await updateDoc(doc(db, 'accounts', accountId), {
        requirePinAfterLock,
        updatedAt: serverTimestamp(),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  // ── Test SMS ──────────────────────────────────────────────────────────────
  async function sendTestSms() {
    if (!testPhone) return
    setTestSmsSending(true)
    setTestSmsResult(null)
    try {
      const res = await fetch('https://stitch-sms.supto98.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testPhone,
          senderName: locSettings.sms.senderName,
          template: locSettings.sms.template,
          firstName: 'Test',
          orderNumber: 'TEST-001',
          businessName: locSettings.businessName || 'Your Business',
          stillDueAmount: 0,
        })
      })
      setTestSmsResult(res.ok ? 'ok' : 'fail')
    } catch {
      setTestSmsResult('fail')
    } finally { setTestSmsSending(false) }
  }

  // ── Gate ──────────────────────────────────────────────────────────────────
  if (!unlocked) {
    return <SettingsPinGate accountId={accountId} onUnlocked={() => setUnlocked(true)} />
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => { const isM = localStorage.getItem('stitch_device_mode') === 'management'; navigate(isM ? '/mgmt-more' : '/pos') }} className="flex items-center gap-1 text-navy text-sm font-medium">
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
              {/* ── Active Location selector ── */}
              {locations.length > 0 && (
                <Section title="Active Location" subtitle="Switch location to edit its settings or use the POS at a different shop">
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
                </Section>
              )}

              {/* ── This Location ── */}
              <Section
                title={`Location — ${activeLocation?.name ?? 'Select a location'}`}
                subtitle="Details specific to this shop only">
                <Field label="Location Name">
                  <Input value={locSettings.name}
                    onChange={v => setLocSettings(s => ({ ...s, name: v }))}
                    placeholder="Chatswood" />
                </Field>
                <Field label="Business Name">
                  <Input value={locSettings.businessName}
                    onChange={v => setLocSettings(s => ({ ...s, businessName: v }))}
                    placeholder="e.g. Acme Alterations" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="ABN">
                    <Input value={locSettings.abn}
                      onChange={v => setLocSettings(s => ({ ...s, abn: v }))}
                      placeholder="12 345 678 901" />
                  </Field>
                  <Field label="Email">
                    <Input value={locSettings.businessEmail}
                      onChange={v => setLocSettings(s => ({ ...s, businessEmail: v }))}
                      type="email" placeholder="hello@business.com.au" />
                  </Field>
                </div>
                <Field label="Shop Type">
                  <div className="grid grid-cols-2 gap-2">
                    {[['alterations', '✂️ Alterations'], ['dryCleaning', '👔 Dry Cleaning']] .map(([val, label]) => (
                      <button key={val} onClick={() => setLocSettings(s => ({ ...s, shopType: val }))}
                        className={`py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                          locSettings.shopType === val
                            ? 'border-navy bg-navy/5 text-navy'
                            : 'border-gray-200 text-gray-600'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Shop Number">
                    <Input value={locSettings.shopNumber}
                      onChange={v => setLocSettings(s => ({ ...s, shopNumber: v }))}
                      placeholder="Shop G04" />
                  </Field>
                  <Field label="Shopping Centre">
                    <Input value={locSettings.shoppingCentre}
                      onChange={v => setLocSettings(s => ({ ...s, shoppingCentre: v }))}
                      placeholder="Westfield Chatswood" />
                  </Field>
                </div>
                <Field label="Street Address">
                  <Input value={locSettings.streetAddress}
                    onChange={v => setLocSettings(s => ({ ...s, streetAddress: v }))}
                    placeholder="1 Anderson St" />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Suburb">
                    <Input value={locSettings.suburb}
                      onChange={v => setLocSettings(s => ({ ...s, suburb: v }))}
                      placeholder="Chatswood" />
                  </Field>
                  <Field label="State">
                    <select value={locSettings.state}
                      onChange={e => setLocSettings(s => ({ ...s, state: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy bg-white">
                      {['NSW','VIC','QLD','WA','SA','TAS','ACT','NT'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Post Code">
                    <Input value={locSettings.postCode}
                      onChange={v => setLocSettings(s => ({ ...s, postCode: v }))}
                      placeholder="2067" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone">
                    <Input value={locSettings.phone}
                      onChange={v => setLocSettings(s => ({ ...s, phone: v }))}
                      placeholder="02 9413 1600" />
                  </Field>
                  <Field label="Order Prefix">
                    <Input value={locSettings.orderPrefix}
                      onChange={v => setLocSettings(s => ({ ...s, orderPrefix: v.toUpperCase() }))}
                      placeholder="CHA" />
                  </Field>
                </div>
                <Field label="Daily Sales Target ($)" note="Used for the revenue progress bar on the POS screen">
                  <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-navy">
                    <span className="text-gray-400 font-medium">$</span>
                    <input type="number" value={locSettings.dailyTarget}
                      onChange={e => setLocSettings(s => ({ ...s, dailyTarget: parseFloat(e.target.value) || 0 }))}
                      className="flex-1 text-sm focus:outline-none bg-transparent" />
                  </div>
                </Field>
              </Section>

              {/* ── SMS Notifications (location-level) ── */}
              <Section title="SMS Notifications" subtitle={`For ${activeLocation?.name ?? 'this location'}`}>
                <Field label="SMS Number"
                  note="Assigned by Stitch. Contact support to set up SMS for this location.">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                    {locSettings.sms.senderName ? (
                      <>
                        <span className="text-green-500 text-lg">✓</span>
                        <span className="text-sm font-medium text-gray-800">{locSettings.sms.senderName}</span>
                        <span className="ml-auto text-xs text-green-600 font-medium">SMS active</span>
                      </>
                    ) : (
                      <>
                        <span className="text-gray-300 text-lg">○</span>
                        <span className="text-sm text-gray-400 italic">Not configured</span>
                        <span className="ml-auto text-xs text-gray-400">SMS inactive</span>
                      </>
                    )}
                  </div>
                </Field>
                <Field label="Message Template"
                  note="Variables: {firstName} {orderNumber} {businessName} {balance}">
                  <textarea
                    value={locSettings.sms.template}
                    onChange={e => setLocSettings(s => ({ ...s, sms: { ...s.sms, template: e.target.value } }))}
                    rows={4}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy resize-none" />
                </Field>
                <Field label="Send Test SMS">
                  <div className="flex gap-2">
                    <Input value={testPhone} onChange={setTestPhone} placeholder="0412 345 678" />
                    <button onClick={sendTestSms} disabled={testSmsSending || !testPhone}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors disabled:opacity-40 ${
                        testSmsResult === 'ok'   ? 'bg-green-500 text-white' :
                        testSmsResult === 'fail' ? 'bg-red-500 text-white' :
                        'bg-navy text-white hover:bg-navy-light'
                      }`}>
                      {testSmsSending ? '…' : testSmsResult === 'ok' ? '✓ Sent' : testSmsResult === 'fail' ? '✗ Failed' : 'Send Test'}
                    </button>
                  </div>
                </Field>
              </Section>

              {/* ── Printers ── */}
              <Section title="Printers">
                <PrinterSettings />
              </Section>

              {/* ── Security (account-level) ── */}
              <Section title="Security" subtitle="Applies to all locations">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Require PIN after lock screen</p>
                    <p className="text-xs text-gray-400 mt-0.5">Staff must enter PIN when screen saver is dismissed</p>
                  </div>
                  <button
                    onClick={() => setRequirePinAfterLock(v => !v)}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                      requirePinAfterLock ? 'bg-navy' : 'bg-gray-200'
                    }`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      requirePinAfterLock ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </Section>

              {/* ── Locations (manage) ── */}
              <Section title="Locations">
                <div className="space-y-2">
                  {allLocations.map(l => (
                    <div key={l.id} className="flex items-center gap-3 py-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{l.name}</p>
                          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{l.orderPrefix}</span>
                          <span className="text-xs text-gray-400">{l.shopType === 'dryCleaning' ? '👔' : '✂️'}</span>
                        </div>
                        {l.suburb && <p className="text-xs text-gray-400">{l.suburb}</p>}
                      </div>
                      <button onClick={() => {
                        setEditingLoc({ id: l.id, name: l.name })
                        setLocForm({ name: l.name, businessName: l.businessName ?? '', abn: l.abn ?? '', businessEmail: l.businessEmail ?? '', shopNumber: l.shopNumber ?? '', shoppingCentre: l.shoppingCentre ?? '', streetAddress: l.streetAddress ?? '', suburb: l.suburb ?? '', state: l.state ?? 'NSW', postCode: l.postCode ?? '', phone: l.phone ?? '', orderPrefix: l.orderPrefix ?? '', shopType: l.shopType ?? 'alterations', dailyTarget: String(l.dailyTarget ?? 1000) })
                        setShowLocSheet(true)
                      }} className="p-1.5 text-gray-400 hover:text-navy transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => reseedLoc(l.id, l.shopType ?? 'alterations', l.name)}
                        title="Reseed items from template"
                        className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"><RefreshCw size={14} /></button>
                      <button onClick={() => deleteLoc(l.id, l.name)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <button onClick={() => {
                    setEditingLoc(null)
                    setLocForm({ name: '', businessName: locSettings.businessName, abn: locSettings.abn, businessEmail: locSettings.businessEmail, shopNumber: '', shoppingCentre: '', streetAddress: '', suburb: '', state: 'NSW', postCode: '', phone: '', orderPrefix: '', shopType: '', dailyTarget: '1000' })
                    setShowLocSheet(true)
                  }} className="flex items-center gap-1.5 text-navy text-sm font-medium mt-2 hover:opacity-70 transition-opacity">
                    <Plus size={15} /> Add Location
                  </button>
                </div>
              </Section>



              {/* ── Plan & Billing ── */}
              <Section title="Plan & Billing">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{plan || 'Trial'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Manage billing via the Billing page</p>
                  </div>
                  <button onClick={() => navigate('/billing')}
                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors">
                    Billing →
                  </button>
                </div>
              </Section>

              {/* ── Save button ── */}
              <button onClick={handleSave} disabled={saving}
                className="w-full py-4 rounded-2xl bg-navy text-white font-bold text-base disabled:opacity-50 transition-colors hover:bg-navy-light">
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Settings'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Add / Edit Location sheet ── */}
      {showLocSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowLocSheet(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative z-10 bg-white rounded-t-3xl w-full max-w-sm pb-10 pt-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="text-center font-bold text-gray-900 mb-4 px-4">{editingLoc ? 'Edit Location' : 'Add Location'}</h3>
            <div className="px-6 space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Location Name</label>
                <input value={locForm.name} onChange={e => setLocForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Chatswood"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Business Name</label>
                <input value={locForm.businessName} onChange={e => setLocForm(f => ({ ...f, businessName: e.target.value }))}
                  placeholder="e.g. Acme Alterations"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ABN</label>
                  <input value={locForm.abn} onChange={e => setLocForm(f => ({ ...f, abn: e.target.value }))}
                    placeholder="12 345 678 901"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <input type="email" value={locForm.businessEmail} onChange={e => setLocForm(f => ({ ...f, businessEmail: e.target.value }))}
                    placeholder="hello@business.com.au"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Shop Number</label>
                  <input value={locForm.shopNumber} onChange={e => setLocForm(f => ({ ...f, shopNumber: e.target.value }))}
                    placeholder="Shop G04"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Shopping Centre</label>
                  <input value={locForm.shoppingCentre} onChange={e => setLocForm(f => ({ ...f, shoppingCentre: e.target.value }))}
                    placeholder="Westfield"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Street Address</label>
                <input value={locForm.streetAddress} onChange={e => setLocForm(f => ({ ...f, streetAddress: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Suburb</label>
                  <input value={locForm.suburb} onChange={e => setLocForm(f => ({ ...f, suburb: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">State</label>
                  <select value={locForm.state} onChange={e => setLocForm(f => ({ ...f, state: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy bg-white">
                    {['NSW','VIC','QLD','WA','SA','TAS','ACT','NT'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Post Code</label>
                  <input value={locForm.postCode} onChange={e => setLocForm(f => ({ ...f, postCode: e.target.value }))}
                    placeholder="2067"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Phone</label>
                  <input value={locForm.phone} onChange={e => setLocForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Order Prefix</label>
                  <input value={locForm.orderPrefix} onChange={e => setLocForm(f => ({ ...f, orderPrefix: e.target.value.toUpperCase() }))}
                    placeholder="CHA"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Shop Type</label>
                <select value={locForm.shopType} onChange={e => setLocForm(f => ({ ...f, shopType: e.target.value }))}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy bg-white ${
                    !locForm.shopType ? 'border-red-300 text-gray-400' : 'border-gray-200'
                  }`}>
                  <option value="" disabled>— Select shop type (required) —</option>
                  <option value="alterations">✂️ Alterations</option>
                  <option value="dryCleaning">👔 Dry Cleaning</option>
                </select>
                {!locForm.shopType && <p className="text-xs text-red-400 mt-1">Shop type is required</p>}
              </div>
              <button onClick={saveLocForm} disabled={!locForm.name.trim() || !locForm.shopType || locSaving}
                className="w-full py-3.5 rounded-xl bg-navy text-white font-semibold text-sm disabled:opacity-50 mt-2">
                {locSaving ? 'Saving…' : editingLoc ? 'Save Changes' : 'Add Location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
