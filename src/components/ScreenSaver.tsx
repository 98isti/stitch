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
    <div className="fixed inset-0 z-[200] bg-navy flex flex-col items-center justify-center select-none cursor-pointer"
      onClick={onDismiss}>

      {/* Centred logo + time as one unit */}
      <div className="animate-pulse flex flex-col items-center gap-8">

        {/* Logo card — slightly smaller */}
        <div className="bg-white rounded-3xl px-12 py-5 shadow-2xl">
          <img src="/stitch-logo.png" alt="Stitch" className="h-20 object-contain" />
        </div>

        {/* Time directly below logo */}
        <p className="text-white/65 font-light"
          style={{ fontSize: '5rem', lineHeight: 1, letterSpacing: '-0.03em' }}>
          {time}
        </p>

        {/* Subtle hint */}
        <p className="text-white/25 text-sm tracking-widest uppercase">Tap anywhere to continue</p>
      </div>
    </div>
  )
}
