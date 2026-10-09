import { useRef, useState } from 'react'

interface Props {
  onTap: () => void
  onDelete: () => void
  children: React.ReactNode
}

const SWIPE_THRESHOLD = 60

export default function SwipeToDeleteItem({ onTap, onDelete, children }: Props) {
  const [offsetX, setOffsetX] = useState(0)
  const [swiped, setSwiped] = useState(false)
  const startX = useRef(0)
  const isDragging = useRef(false)
  const moved = useRef(false)

  function handlePointerDown(e: React.PointerEvent) {
    startX.current = e.clientX
    isDragging.current = true
    moved.current = false
    setSwiped(false)
    setOffsetX(0)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging.current) return
    const dx = e.clientX - startX.current
    if (dx < -5) moved.current = true
    if (dx < 0) setOffsetX(Math.max(dx, -100))
  }

  function handlePointerUp() {
    isDragging.current = false
    if (-offsetX >= SWIPE_THRESHOLD) {
      setOffsetX(-80)
      setSwiped(true)
    } else {
      setOffsetX(0)
      setSwiped(false)
      if (!moved.current) onTap()
    }
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    onDelete()
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Delete button revealed on swipe */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center">
        <button
          onClick={handleDelete}
          className="h-full px-5 bg-red-500 text-white text-sm font-semibold active:bg-red-600 transition-colors">
          Delete
        </button>
      </div>

      {/* Item content — slides left on swipe */}
      <div
        className="relative bg-white transition-transform"
        style={{ transform: `translateX(${offsetX}px)`, transitionDuration: isDragging.current ? '0ms' : '200ms' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {children}
      </div>

      {/* Tap outside swiped item to reset */}
      {swiped && (
        <div className="fixed inset-0 z-10" onClick={() => { setOffsetX(0); setSwiped(false) }} />
      )}
    </div>
  )
}
