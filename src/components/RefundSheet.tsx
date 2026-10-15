import { useState } from 'react'

interface Props {
  orderAmount: number
  orderNumber: string
  onConfirm: (amount: number, reason: string) => void
  onCancel: () => void
}

export default function RefundSheet({ orderAmount, orderNumber, onConfirm, onCancel }: Props) {
  const [amount, setAmount] = useState(orderAmount.toFixed(2))
  const [reason, setReason] = useState('')

  const parsedAmount = parseFloat(amount) || 0
  const canConfirm = parsedAmount > 0

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-10 bg-white rounded-t-3xl w-full max-w-lg shadow-2xl overflow-hidden pb-8">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1" />

        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <button onClick={onCancel} className="text-gray-500 text-sm font-medium">Cancel</button>
          <h2 className="font-bold text-gray-900">Record Refund — {orderNumber}</h2>
          <button
            onClick={() => canConfirm && onConfirm(parsedAmount, reason.trim())}
            disabled={!canConfirm}
            className="text-red-500 text-sm font-semibold disabled:opacity-30">
            Record
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Refund Amount</label>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus-within:ring-2 focus-within:ring-red-300 focus-within:border-red-400">
              <span className="text-gray-500 font-medium text-lg">$</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="flex-1 bg-transparent text-gray-900 text-xl font-bold focus:outline-none"
                inputMode="decimal"
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Order total: ${orderAmount.toFixed(2)} — edit for partial refund</p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Reason <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Customer not satisfied, item damaged, order cancelled..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-400 resize-none placeholder-gray-300"
            />
          </div>

          {/* EFTPOS note */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-700 font-semibold mb-0.5">⚠️ Process refund on your EFTPOS terminal first</p>
            <p className="text-xs text-amber-600">This only records the refund in Stitch. The actual money is returned via your payment terminal.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
