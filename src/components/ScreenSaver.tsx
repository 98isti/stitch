import { useEffect, useState } from 'react'

interface Props { onDismiss: () => void }

export default function ScreenSaver({ onDismiss }: Props) {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  )

  useEffect(() => {
    const tick = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }))
    }, 1000)
    return () => clearInterval(tick)
  }, [])

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
    <div className="fixed inset-0 z-[200] bg-navy flex flex-col items-center justify-between py-20 select-none cursor-pointer"
      onClick={onDismiss}>

      {/* Logo — top, rounded white card, slow pulse */}
      <div className="animate-pulse flex-1 flex items-center justify-center">
        <div className="bg-white rounded-3xl px-14 py-7 shadow-2xl">
          <img src="/stitch-logo.png" alt="Stitch" className="h-24 object-contain" />
        </div>
      </div>

      {/* Bottom: hint + clock */}
      <div className="flex flex-col items-center gap-4">
        <p className="text-white/30 text-base tracking-wide">Tap anywhere to continue</p>
        <p className="text-white/60 font-thin"
          style={{ fontSize: '4.5rem', lineHeight: 1, letterSpacing: '-0.02em' }}>
          {time}
        </p>
      </div>
    </div>
  )
}
