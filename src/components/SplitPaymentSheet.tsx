import { useState } from 'react'

export default function SplitPaymentSheet({
  total, onConfirm, onClose,
}: {
  total: number
  onConfirm: (cash: number, card: number, stillDue: number) => void
  onClose: () => void
}) {
  const [cash, setCash] = useState('')
  const [card, setCard] = useState('')

  const cashNum = parseFloat(cash) || 0
  const cardNum = parseFloat(card) || 0
  const stillDue = Math.max(0, Math.round((total - cashNum - cardNum) * 100) / 100)
  const overpaid = cashNum + cardNum > total + 0.001

  function handleCashChange(v: string) {
    setCash(v)
    const c = parseFloat(v) || 0
    const remaining = Math.max(0, Math.round((total - c) * 100) / 100)
    setCard(remaining > 0 ? remaining.toFixed(2) : '')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 bg-white rounded-t-3xl w-full max-w-sm pb-10 pt-4 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h3 className="text-center font-bold text-gray-900 text-lg mb-1 px-4">Split / Partial — ${total.toFixed(2)}</h3>
        <p className="text-center text-gray-400 text-sm mb-6 px-4">Enter amounts — remaining becomes Still Due</p>

        <div className="px-6 space-y-3 mb-4">
          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
            <span className="text-2xl">💵</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-400 mb-0.5">Cash</p>
              <input type="number" inputMode="decimal" placeholder="0.00" value={cash}
                onChange={e => handleCashChange(e.target.value)}
                className="w-full text-xl font-bold text-gray-900 bg-transparent focus:outline-none" />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
            <span className="text-2xl">💳</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-400 mb-0.5">Card</p>
              <input type="number" inputMode="decimal" placeholder="0.00" value={card}
                onChange={e => setCard(e.target.value)}
                className="w-full text-xl font-bold text-gray-900 bg-transparent focus:outline-none" />
            </div>
          </div>

          <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${stillDue > 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
            <span className="text-2xl">{stillDue > 0 ? '🕐' : '✅'}</span>
            <div className="flex-1">
              <p className={`text-xs font-semibold mb-0.5 ${stillDue > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {stillDue > 0 ? 'Still Due' : 'Fully Paid'}
              </p>
              <p className={`text-xl font-bold ${stillDue > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                ${stillDue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {overpaid && (
          <p className="text-center text-red-500 text-sm px-6 mb-3">Total exceeds ${total.toFixed(2)}</p>
        )}

        <div className="px-6">
          <button
            onClick={() => { if (!overpaid && (cashNum > 0 || cardNum > 0)) onConfirm(cashNum, cardNum, stillDue) }}
            disabled={overpaid || (cashNum === 0 && cardNum === 0)}
            className="w-full py-4 rounded-2xl bg-navy text-white font-bold text-lg disabled:opacity-40 transition-colors">
            Confirm Payment
          </button>
        </div>
      </div>
    </div>
  )
}
