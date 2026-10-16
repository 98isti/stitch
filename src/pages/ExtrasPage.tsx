import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { Trash2 } from 'lucide-react'

interface Extra {
  name: string
  price: number
}

export default function ExtrasPage() {
  const { accountId } = useAuth()
  const navigate = useNavigate()
  const [extras, setExtras] = useState<Extra[]>([])
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!accountId) return
    getDoc(doc(db, 'accounts', accountId)).then(snap => {
      if (snap.exists()) setExtras(snap.data().extras ?? [])
      setLoading(false)
    })
  }, [accountId])

  async function save(updated: Extra[]) {
    if (!accountId) return
    setSaving(true)
    await updateDoc(doc(db, 'accounts', accountId), { extras: updated })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function addExtra() {
    if (!newName.trim()) return
    const updated = [...extras, { name: newName.trim(), price: parseFloat(newPrice) || 0 }]
    setExtras(updated)
    setNewName('')
    setNewPrice('')
    save(updated)
  }

  function removeExtra(i: number) {
    const updated = extras.filter((_, j) => j !== i)
    setExtras(updated)
    save(updated)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-navy font-medium text-sm flex items-center gap-1">
          ← Back
        </button>
        <h1 className="flex-1 text-center font-bold text-navy text-base">Extras</h1>
        {saved
          ? <span className="text-green-500 text-sm font-medium">Saved ✓</span>
          : saving
            ? <span className="text-gray-400 text-sm">Saving…</span>
            : <span className="w-12" />
        }
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        <p className="text-sm text-gray-500">
          Add-ons available when editing a sale item — e.g. Deluxe, Express, Delicate.
        </p>

        {/* Existing extras */}
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
          {loading ? (
            <p className="text-sm text-gray-400 p-4">Loading…</p>
          ) : extras.length === 0 ? (
            <p className="text-sm text-gray-400 p-4">No extras yet. Add one below.</p>
          ) : (
            extras.map((extra, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <span className="flex-1 text-sm font-medium text-gray-800">{extra.name}</span>
                <span className="text-sm text-gray-500">${extra.price.toFixed(2)}</span>
                <button onClick={() => removeExtra(i)}
                  className="text-red-400 hover:text-red-600 transition-colors ml-2">
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add new extra */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Add Extra</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addExtra()}
              placeholder="Name (e.g. Express)"
              className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-navy"
            />
            <div className="flex items-center gap-1 px-3 py-2.5 rounded-xl border border-gray-200 w-24">
              <span className="text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={newPrice}
                onChange={e => setNewPrice(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addExtra()}
                placeholder="0"
                inputMode="decimal"
                className="w-full bg-transparent text-sm focus:outline-none"
              />
            </div>
            <button onClick={addExtra} disabled={!newName.trim()}
              className="px-4 py-2.5 bg-navy text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-navy/90 transition-colors">
              Add
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
