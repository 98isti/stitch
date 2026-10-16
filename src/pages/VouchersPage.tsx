import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { usePrinter } from '../context/PrinterContext'
import { useLocations } from '../hooks/useLocations'
import { useAccountProfile } from '../hooks/useAccountProfile'
import { useNavigate } from 'react-router-dom'
import { Plus, X, RefreshCw, Printer } from 'lucide-react'

interface Voucher {
  id: string; code: string; amount: number
  customerName: string; customerPhone: string
  locationName: string
  issueDate: string; expiryDate: string
  isRedeemed: boolean; redeemedAt?: string
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
  return expiryDate < new Date().toISOString().slice(0, 10)
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
    return d.toISOString().slice(0, 10)
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
    if (!accountId || !form.amount) return
    setSaving(true)
    try {
      const issueDate = new Date().toISOString().slice(0, 10)
      const newVoucher: Omit<Voucher, 'id'> = {
        code: form.code, amount: parseFloat(form.amount),
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

  const activeCount   = vouchers.filter(v => !v.isRedeemed && !isExpired(v.expiryDate)).length
  const redeemedCount = vouchers.filter(v => v.isRedeemed).length

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-navy font-medium text-sm">← Back</button>
        <h1 className="flex-1 text-center font-bold text-navy text-base">Gift Vouchers</h1>
        <button
          onClick={() => { setForm({ code: randomCode(), amount: '', customerName: '', customerPhone: '', expiryDate: defaultExpiry() }); setShowSheet(true) }}
          className="flex items-center gap-1 bg-navy text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-navy/90 transition-colors">
          <Plus size={14} /> New
        </button>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-3">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-navy">{activeCount}</p>
            <p className="text-xs text-gray-400">Active</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-400">{redeemedCount}</p>
            <p className="text-xs text-gray-400">Redeemed</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-700">{vouchers.length}</p>
            <p className="text-xs text-gray-400">Total</p>
          </div>
        </div>

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
            <div key={v.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden border ${redeemed ? 'border-gray-100' : expired ? 'border-orange-100' : 'border-green-100'}`}>

              {/* Status bar */}
              <div className={`h-1 ${redeemed ? 'bg-gray-200' : expired ? 'bg-orange-300' : 'bg-green-400'}`} />

              <div className="p-4">
                {/* Top row: code + amount */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono font-bold text-2xl text-navy tracking-wider">{v.code}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {redeemed
                        ? <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Redeemed</span>
                        : expired
                          ? <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">Expired</span>
                          : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Active</span>
                      }
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">${v.amount.toFixed(2)}</p>
                </div>

                {/* Customer */}
                {(v.customerName || v.customerPhone) && (
                  <div className="mb-2">
                    {v.customerName && <p className="text-sm font-medium text-gray-700">{v.customerName}</p>}
                    {v.customerPhone && <p className="text-xs text-gray-400">{v.customerPhone}</p>}
                  </div>
                )}

                {/* Location + dates */}
                <div className="text-xs text-gray-400 space-y-0.5">
                  {v.locationName && <p>📍 {v.locationName}</p>}
                  <p>Issued: {fmtDate(v.issueDate)} · Expires: {fmtDate(v.expiryDate)}</p>
                </div>

                {/* Actions */}
                {!redeemed && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => doPrintVoucher(v)}
                      className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
                      <Printer size={12} /> Reprint
                    </button>
                    {!expired && (
                      <button onClick={() => markRedeemed(v)} disabled={redeeming === v.id}
                        className="flex-1 text-xs bg-navy text-white font-semibold py-1.5 rounded-xl hover:bg-navy/90 transition-colors disabled:opacity-50">
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
                <label className="text-xs text-gray-500 mb-1 block">Customer Phone (optional)</label>
                <input type="tel" value={form.customerPhone} onChange={e => set('customerPhone', e.target.value)}
                  placeholder="04XX XXX XXX"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-navy" />
              </div>

              {/* Expiry */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Expiry Date (default 3 months)</label>
                <input type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-navy" />
              </div>

              <button onClick={handleIssue} disabled={!form.amount || saving}
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
