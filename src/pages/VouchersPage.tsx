import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { usePrinter } from '../context/PrinterContext'
import { useLocations } from '../hooks/useLocations'
import { useAccountProfile } from '../hooks/useAccountProfile'
import { useNavigate } from 'react-router-dom'
import { Plus, X, RefreshCw, Printer } from 'lucide-react'
import { todayLocal, dateToLocalISO } from '../lib/dateUtils'

interface Voucher {
  id: string; code: string; amount: number; balance: number
  customerName: string; customerPhone: string
  locationName: string
  issueDate: string; expiryDate: string
  isRedeemed: boolean; redeemedAt?: string; lastUsedDate?: string
}

interface FormState {
  code: string; amount: string; customerName: string
  customerPhone: string; expiryDate: string
}

function randomCode() { return Math.random().toString(36).slice(2, 6).toUpperCase() }

function fmtDate(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`
}

function isExpired(expiryDate: string) {
  return expiryDate < todayLocal()
}

export default function VouchersPage() {
  const { accountId }    = useAuth()
  const navigate         = useNavigate()
  const { printVoucher } = usePrinter()
  const { activeLocation } = useLocations(accountId)
  const accountProfile   = useAccountProfile(accountId)

  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading]   = useState(true)
  const [showSheet, setShowSheet] = useState(false)
  const [filter, setFilter]     = useState<'active' | 'redeemed' | 'all'>('active')
  const [search, setSearch]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [redeeming, setRedeeming] = useState<string | null>(null)

  function defaultExpiry() {
    const d = new Date(); d.setMonth(d.getMonth() + 3)
    return dateToLocalISO(d)
  }

  const [form, setForm] = useState<FormState>({
    code: randomCode(), amount: '', customerName: '', customerPhone: '', expiryDate: defaultExpiry()
  })

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function fetchVouchers() {
    if (!accountId) return
    setLoading(true)
    const snap = await getDocs(query(
      collection(db, 'accounts', accountId, 'vouchers'),
      orderBy('issueDate', 'desc')
    ))
    setVouchers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Voucher)))
    setLoading(false)
  }

  useEffect(() => { fetchVouchers() }, [accountId])

  function doPrintVoucher(v: Voucher) {
    printVoucher({
      businessName:    activeLocation?.businessName || accountProfile?.businessName || '',
      locationName:    activeLocation?.name || '',
      locationAddress: [activeLocation?.shopNumber, activeLocation?.shoppingCentre, activeLocation?.streetAddress, activeLocation?.suburb, activeLocation?.state].filter(Boolean).join(', '),
      locationPhone:   activeLocation?.phone || '',
      abn:             activeLocation?.abn || (accountProfile as any)?.abn || '',
      voucherCode:     v.code,
      amount:          v.amount,
      customerName:    v.customerName,
      customerPhone:   v.customerPhone,
      issueDate:       v.issueDate,
      expiryDate:      v.expiryDate,
    })
  }

  async function handleIssue() {
    if (!accountId || !form.amount || !form.customerPhone.trim()) return
    setSaving(true)
    try {
      const issueDate = todayLocal()
      const newVoucher: Omit<Voucher, 'id'> = {
        code: form.code, amount: parseFloat(form.amount), balance: parseFloat(form.amount),
        customerName: form.customerName, customerPhone: form.customerPhone,
        locationName: activeLocation?.name || '',
        issueDate, expiryDate: form.expiryDate, isRedeemed: false,
      }
      await addDoc(collection(db, 'accounts', accountId, 'vouchers'), {
        ...newVoucher, createdAt: serverTimestamp()
      })
      doPrintVoucher({ id: '', ...newVoucher })
      setShowSheet(false)
      fetchVouchers()
    } finally { setSaving(false) }
  }

  async function markRedeemed(v: Voucher) {
    if (!accountId) return
    setRedeeming(v.id)
    try {
      await updateDoc(doc(db, 'accounts', accountId, 'vouchers', v.id), {
        isRedeemed: true, redeemedAt: serverTimestamp()
      })
      setVouchers(prev => prev.map(x => x.id === v.id ? { ...x, isRedeemed: true } : x))
    } finally { setRedeeming(null) }
  }

  // Filter + search
  const filtered = vouchers.filter(v => {
    if (filter === 'active'   && (v.isRedeemed || isExpired(v.expiryDate))) return false
    if (filter === 'redeemed' && !v.isRedeemed) return false
    if (search) {
      const s = search.toLowerCase()
      if (!v.code.toLowerCase().includes(s) && !v.customerName.toLowerCase().includes(s) && !v.customerPhone.includes(s)) return false
    }
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => { const isM = localStorage.getItem('stitch_device_mode') === 'management'; navigate(isM ? '/mgmt-more' : -1 as any) }} className="text-navy font-medium text-sm">← Back</button>
        <h1 className="flex-1 text-center font-bold text-navy text-base">Gift Vouchers</h1>
        <button
          onClick={() => { setForm({ code: randomCode(), amount: '', customerName: '', customerPhone: '', expiryDate: defaultExpiry() }); setShowSheet(true) }}
          className="flex items-center gap-1 bg-navy text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-navy/90 transition-colors">
          <Plus size={14} /> New
        </button>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-3">

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm px-4 py-2.5">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by code, name or phone…"
            className="w-full text-sm text-gray-700 focus:outline-none placeholder-gray-300" />
        </div>

        {/* Filter tabs */}
        <div className="flex bg-white rounded-xl shadow-sm overflow-hidden">
          {(['active', 'redeemed', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${filter === f ? 'bg-navy text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">🎟️</p>
            <p className="text-sm text-gray-400">{search ? 'No vouchers match' : 'No vouchers here'}</p>
          </div>
        ) : filtered.map(v => {
          const expired  = isExpired(v.expiryDate)
          const redeemed = v.isRedeemed

          return (
            <div key={v.id} className={`bg-white rounded-xl shadow-sm overflow-hidden border-l-4 ${redeemed ? 'border-l-gray-200' : expired ? 'border-l-orange-300' : 'border-l-green-400'}`}>
              <div className="px-3 py-2.5">
                {/* Row 1: code + amount + status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-base text-navy tracking-wider">{v.code}</span>
                    {redeemed
                      ? <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">Redeemed</span>
                      : expired
                        ? <span className="text-xs bg-orange-100 text-orange-500 px-1.5 py-0.5 rounded-full">Expired</span>
                        : <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">Active</span>
                    }
                  </div>
                  <span className="font-bold text-base text-gray-900">${v.amount.toFixed(2)}</span>
                </div>

                {/* Row 2: customer + location + dates */}
                <div className="flex items-center justify-between mt-1">
                  <div>
                    {v.customerName && <span className="text-xs text-gray-700 font-medium">{v.customerName}</span>}
                    {v.customerPhone && <span className="text-xs text-gray-400"> · {v.customerPhone}</span>}
                    {v.locationName && <span className="text-xs text-gray-400"> · {v.locationName}</span>}
                  </div>
                  <span className="text-xs text-gray-400">{fmtDate(v.issueDate)} → {fmtDate(v.expiryDate)}</span>
                </div>

                {/* Actions — only if not redeemed */}
                {!redeemed && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => doPrintVoucher(v)}
                      className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors">
                      <Printer size={11} /> Reprint
                    </button>
                    {!expired && (
                      <button onClick={() => markRedeemed(v)} disabled={redeeming === v.id}
                        className="flex-1 text-xs bg-navy text-white font-semibold py-1 rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-50">
                        {redeeming === v.id ? 'Saving…' : 'Mark as Redeemed'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}

      </div>

      {/* Issue sheet */}
      {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowSheet(false)} />
          <div className="relative w-full bg-white rounded-t-2xl shadow-2xl max-w-lg mx-auto overflow-hidden">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-4 mb-3" />
            <div className="flex items-center justify-between px-6 mb-4">
              <h2 className="font-bold text-navy text-lg">New Gift Voucher</h2>
              <button onClick={() => setShowSheet(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="px-6 space-y-3 overflow-y-auto max-h-[70vh] pb-10">

              {/* Code */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Voucher Code</label>
                <div className="flex gap-2">
                  <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono font-bold tracking-wider focus:outline-none focus:border-navy" />
                  <button onClick={() => set('code', randomCode())}
                    className="px-3 py-2.5 border border-gray-200 rounded-xl text-gray-400 hover:bg-gray-50 transition-colors">
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Amount *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                  <input type="number" step="0.01" min="0" value={form.amount}
                    onChange={e => set('amount', e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:border-navy" />
                </div>
              </div>

              {/* Customer */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Customer Name</label>
                <input value={form.customerName} onChange={e => set('customerName', e.target.value)}
                  placeholder="e.g. Sarah"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-navy" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Customer Phone *</label>
                <input type="tel" value={form.customerPhone} onChange={e => set('customerPhone', e.target.value)}
                  placeholder="04XX XXX XXX"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-navy" />
              </div>

              {/* Expiry */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Expiry Date (default 3 months)</label>
                <input type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)}
                  min={todayLocal()}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-navy" />
              </div>

              <button onClick={handleIssue} disabled={!form.amount || !form.customerPhone.trim() || saving}
                className="w-full bg-navy text-white py-3.5 rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-navy/90 transition-colors">
                {saving ? 'Issuing…' : 'Issue & Print Voucher'}
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
