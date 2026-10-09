import { useState, useEffect } from 'react'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Save } from 'lucide-react'

interface Profile { businessName: string; abn: string; email: string; plan: string }

export default function SettingsPage() {
  const { accountId } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<Profile>({ businessName: '', abn: '', email: '', plan: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!accountId) return
    getDoc(doc(db, 'accounts', accountId, 'profile', 'main'))
      .then(snap => {
        if (snap.exists()) setForm(snap.data() as Profile)
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [accountId])

  async function handleSave() {
    if (!accountId) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'accounts', accountId, 'profile', 'main'), {
        ...form, updatedAt: serverTimestamp()
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  function field(label: string, key: keyof Profile, type = 'text') {
    return (
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
        <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/pos')} className="flex items-center gap-1 text-navy text-sm font-medium"><ChevronLeft size={18} /> Back</button>
        <h1 className="flex-1 text-center font-bold text-gray-900">Settings</h1>
        <button onClick={handleSave} disabled={saving || loading}
          className="flex items-center gap-1 text-navy text-sm font-semibold disabled:opacity-50">
          <Save size={14} /> {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Business Info</h3>
              {field('Business Name', 'businessName')}
              {field('ABN', 'abn')}
              {field('Email', 'email', 'email')}
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Plan</h3>
              <p className="text-sm text-gray-600">{form.plan || 'Trial'}</p>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="w-full py-4 rounded-2xl bg-navy text-white font-bold disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
