import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { Plus, ChevronLeft, Gift } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Voucher { id: string; code: string; amount: number; customerName: string; issueDate: string; expiryDate: string; isRedeemed: boolean }
interface FormState { code: string; amount: string; customerName: string; expiryDate: string }

function randomCode() { return 'STI-' + Math.random().toString(36).slice(2,8).toUpperCase() }

export default function VouchersPage() {
  const { accountId } = useAuth()
  const navigate = useNavigate()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [showSheet, setShowSheet] = useState(false)
  const [form, setForm] = useState<FormState>({ code: randomCode(), amount: '', customerName: '', expiryDate: '' })
  const [saving, setSaving] = useState(false)
  const [redeeming, setRedeeming] = useState<string | null>(null)

  async function fetchVouchers() {
    if (!accountId) return
    setLoading(true)
    const snap = await getDocs(query(collection(db, 'accounts', accountId, 'vouchers'), orderBy('issueDate', 'desc')))
    setVouchers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Voucher)))
    setLoading(false)
  }
  useEffect(() => { fetchVouchers() }, [accountId])

  async function handleIssue() {
    if (!accountId || !form.amount) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'accounts', accountId, 'vouchers'), {
        code: form.code,
        amount: parseFloat(form.amount),
        customerName: form.customerName,
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: form.expiryDate,
        isRedeemed: false,
        createdAt: serverTimestamp(),
      })
      setShowSheet(false)
      fetchVouchers()
    } finally { setSaving(false) }
  }

  async function markRedeemed(v: Voucher) {
    if (!accountId || !confirm(`Mark voucher ${v.code} as redeemed?`)) return
    setRedeeming(v.id)
    try {
      await updateDoc(doc(db, 'accounts', accountId, 'vouchers', v.id), { isRedeemed: true, redeemedAt: serverTimestamp() })
      setVouchers(prev => prev.map(x => x.id === v.id ? { ...x, isRedeemed: true } : x))
    } finally { setRedeeming(null) }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <button onClick={() => navigate('/pos')} className="flex items-center gap-1 text-navy text-sm font-medium"><ChevronLeft size={18} /> Back</button>
        <h1 className="font-bold text-gray-900">Gift Vouchers</h1>
        <button onClick={() => { setForm({ code: randomCode(), amount: '', customerName: '', expiryDate: '' }); setShowSheet(true) }}
          className="flex items-center gap-1 text-navy text-sm font-medium"><Plus size={16} /> Issue</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" /></div>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-3">🎟️</p><p className="text-sm">No vouchers issued yet</p></div>
        ) : vouchers.map(v => (
          <div key={v.id} className={`bg-white rounded-xl p-4 border ${v.isRedeemed ? 'border-gray-100 opacity-60' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gift size={20} className={v.isRedeemed ? 'text-gray-300' : 'text-tan'} />
                <div>
                  <p className="font-mono font-bold text-gray-900">{v.code}</p>
                  <p className="text-xs text-gray-400">{v.customerName || 'No customer'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg text-gray-900">${v.amount.toFixed(2)}</p>
                {v.isRedeemed ? (
                  <span className="text-xs text-gray-400">Redeemed</span>
                ) : (
                  <button onClick={() => markRedeemed(v)} disabled={redeeming === v.id}
                    className="text-xs text-navy font-semibold hover:underline disabled:opacity-50">
                    {redeeming === v.id ? 'Saving…' : 'Mark Redeemed'}
                  </button>
                )}
              </div>
            </div>
            {v.expiryDate && (
              <p className="text-xs text-gray-400 mt-2">Expires: {v.expiryDate}</p>
            )}
          </div>
        ))}
      </div>

      {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowSheet(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative z-10 bg-white rounded-t-3xl w-full max-w-sm pb-10 pt-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="text-center font-bold text-gray-900 mb-4 px-4">Issue Gift Voucher</h3>
            <div className="px-6 space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Code</label>
                <div className="flex gap-2">
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-navy" />
                  <button onClick={() => setForm(f => ({ ...f, code: randomCode() }))}
                    className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">↺</button>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="Amount *"
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:border-navy" />
              </div>
              <input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                placeholder="Customer name"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-navy" />
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Expiry date</label>
                <input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-navy" />
              </div>
              <button onClick={handleIssue} disabled={!form.amount || saving}
                className="w-full py-3.5 rounded-xl bg-navy text-white font-semibold text-sm disabled:opacity-50">
                {saving ? 'Issuing…' : 'Issue Voucher'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
