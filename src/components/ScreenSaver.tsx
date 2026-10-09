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
        <img src="/stitch-logo.png" alt="Stitch" className="h-24 object-contain mx-auto mb-4" />
        <p className="text-white/40 text-sm mt-2">Tap anywhere to continue</p>
      </div>
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-white/20 text-xs">{new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </div>
  )
}
