interface Props {
  message: string
  subMessage?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmDestructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  message,
  subMessage,
  confirmLabel = 'Yes',
  cancelLabel = 'Cancel',
  confirmDestructive = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 pt-6 pb-5 text-center">
          <p className="font-semibold text-gray-900 text-base">{message}</p>
          {subMessage && <p className="text-sm text-gray-500 mt-1.5">{subMessage}</p>}
        </div>
        <div className="border-t border-gray-100 grid grid-cols-2">
          <button
            onClick={onCancel}
            className="py-4 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-100">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`py-4 text-sm font-semibold transition-colors ${
              confirmDestructive
                ? 'text-red-500 hover:bg-red-50'
                : 'text-navy hover:bg-navy/5'
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
