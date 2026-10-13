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

      {/* Live clock — large */}
      <p className="text-white/70 font-thin mb-12"
        style={{ fontSize: '7rem', lineHeight: 1, letterSpacing: '-0.02em' }}>
        {time}
      </p>

      {/* Logo — larger, slow pulse */}
      <div className="animate-pulse">
        <div className="bg-white/90 rounded-3xl px-12 py-6 inline-block shadow-2xl">
          <img src="/stitch-logo.png" alt="Stitch" className="h-28 object-contain" />
        </div>
      </div>

      <p className="text-white/30 text-base mt-10 tracking-wide">Tap anywhere to continue</p>
    </div>
  )
}
