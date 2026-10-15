import { useState } from 'react'

interface Props {
  currentPickupDate: string  // ISO date string
  onConfirm: (reason: string, newPickupDate: string) => void
  onCancel: () => void
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export default function RedoSheet({ currentPickupDate, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState('')
  const [pickupDate, setPickupDate] = useState(() => {
    const today = new Date().toISOString().split('T')[0]
    return addDays(today, 2)
  })

  const canConfirm = reason.trim().length > 0

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-10 bg-white rounded-t-3xl w-full max-w-lg shadow-2xl overflow-hidden pb-8">
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <button onClick={onCancel} className="text-gray-500 text-sm font-medium">Cancel</button>
          <h2 className="font-bold text-gray-900">Mark as Redo</h2>
          <button
            onClick={() => canConfirm && onConfirm(reason.trim(), pickupDate)}
            disabled={!canConfirm}
            className="text-navy text-sm font-semibold disabled:opacity-30 transition-opacity">
            Confirm
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Describe the issue — e.g. Stain still visible on left sleeve, customer not satisfied with pressing..."
              rows={4}
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy resize-none placeholder-gray-300"
            />
          </div>

          {/* New pickup date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Pickup Date</label>
            <input
              type="date"
              value={pickupDate}
              onChange={e => setPickupDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy bg-white"
            />
          </div>

          {/* Info note */}
          <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-3">
            Original pickup date will be kept on record. Labels and receipt will be reprinted automatically.
          </p>
        </div>
      </div>
    </div>
  )
}
