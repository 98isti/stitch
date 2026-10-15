import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  orderNumber: string
  onConfirm: (reason: string) => void
  onCancel: () => void
}

export default function CancelOrderSheet({ orderNumber, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-10 bg-white rounded-t-3xl w-full max-w-lg shadow-2xl overflow-hidden pb-8">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1" />

        {/* Warning header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-red-500" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Cancel Order {orderNumber}</h2>
              <p className="text-xs text-red-500 font-medium mt-0.5">This cannot be undone</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Reason <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Customer changed their mind, item damaged..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-400 resize-none placeholder-gray-300"
            />
          </div>

          <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-3">
            The order will remain in the system for records but will be permanently marked as cancelled. If a refund is needed, use the Refund option after cancelling.
          </p>

          <button
            onClick={() => onConfirm(reason.trim())}
            className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 active:scale-[0.98] transition-all text-white font-bold text-base">
            Cancel Order
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
            Keep Order
          </button>
        </div>
      </div>
    </div>
  )
}
