import { useEffect } from 'react'

interface Props { onDismiss: () => void }

export default function ScreenSaver({ onDismiss }: Props) {
  useEffect(() => {
    const handler = () => onDismiss()
    window.addEventListener('pointerdown', handler)
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('pointerdown', handler)
      window.removeEventListener('keydown', handler)
    }
  }, [onDismiss])

  return (
    <div className="fixed inset-0 z-[200] bg-navy flex flex-col items-center justify-center select-none cursor-pointer"
      onClick={onDismiss}>
      <div className="text-center animate-pulse">
        <div className="w-16 h-16 bg-tan rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-navy text-3xl font-bold">S</span>
        </div>
        <p className="text-white text-3xl font-bold tracking-tight">Stitch</p>
        <p className="text-white/40 text-sm mt-2">Tap anywhere to continue</p>
      </div>
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-white/20 text-xs">{new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </div>
  )
}
