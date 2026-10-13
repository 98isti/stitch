/**
 * ScanOrderSheet — QR code scanner popup
 *
 * Opens the device camera, continuously decodes frames with jsQR,
 * queries Firestore for the order matching the scanned barcode UUID,
 * then calls onFound(orderId) so the caller can open OrderDetailSheet.
 */

import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'

interface Props {
  accountId: string
  onFound: (orderId: string) => void
  onClose: () => void
}

export default function ScanOrderSheet({ accountId, onFound, onClose }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef    = useRef<number>(0)

  const [status, setStatus] = useState<'starting' | 'scanning' | 'found' | 'error'>('starting')
  const [errorMsg, setErrorMsg] = useState('')

  // Start camera on mount, stop on unmount
  useEffect(() => {
    let active = true

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setStatus('scanning')
          tick()
        }
      } catch (e: any) {
        if (!active) return
        const msg = e?.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera access in Settings.'
          : 'Could not open camera.'
        setErrorMsg(msg)
        setStatus('error')
      }
    }

    function tick() {
      if (!active || !videoRef.current || !canvasRef.current) return
      const video  = videoRef.current
      const canvas = canvasRef.current
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width  = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const result = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        })
        if (result?.data) {
          handleScanned(result.data)
          return // stop ticking after a hit
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    startCamera()
    return () => {
      active = false
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  async function handleScanned(barcode: string) {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    setStatus('found')

    try {
      const ordersRef = collection(db, 'accounts', accountId, 'orders')
      const q = query(ordersRef, where('barcode', '==', barcode))
      const snap = await getDocs(q)
      if (snap.empty) {
        setErrorMsg('No order found for this QR code.')
        setStatus('error')
        return
      }
      onFound(snap.docs[0].id)
    } catch {
      setErrorMsg('Error looking up order. Try again.')
      setStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">

      {/* Camera feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Scan frame overlay */}
      {status === 'scanning' && (
        <div className="relative z-10 flex flex-col items-center gap-6">
          {/* Cut-out square */}
          <div className="w-64 h-64 relative">
            {/* Corner markers */}
            {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
              <div key={i} className={`absolute w-8 h-8 border-white ${pos} ${
                i === 0 ? 'border-t-4 border-l-4 rounded-tl-lg' :
                i === 1 ? 'border-t-4 border-r-4 rounded-tr-lg' :
                i === 2 ? 'border-b-4 border-l-4 rounded-bl-lg' :
                          'border-b-4 border-r-4 rounded-br-lg'
              }`} />
            ))}
            {/* Scan line animation */}
            <div className="absolute inset-x-0 top-0 h-0.5 bg-green-400 opacity-80 animate-scan-line" />
          </div>
          <p className="text-white text-sm font-medium drop-shadow">Point at a receipt QR code</p>
        </div>
      )}

      {/* Starting */}
      {status === 'starting' && (
        <p className="relative z-10 text-white text-sm animate-pulse">Starting camera…</p>
      )}

      {/* Found */}
      {status === 'found' && (
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
            <span className="text-white text-3xl">✓</span>
          </div>
          <p className="text-white text-sm">Found — loading order…</p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="relative z-10 flex flex-col items-center gap-4 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
            <span className="text-white text-3xl">✕</span>
          </div>
          <p className="text-white text-sm">{errorMsg}</p>
          <button
            onClick={() => { setStatus('starting'); setErrorMsg('') }}
            className="px-6 py-2 bg-white/20 text-white rounded-xl text-sm font-semibold">
            Try Again
          </button>
        </div>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-8 right-6 z-20 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center text-xl">
        ✕
      </button>
    </div>
  )
}
