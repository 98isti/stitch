import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Monitor, BarChart2 } from 'lucide-react'

export const DEVICE_MODE_KEY = 'stitch_device_mode'
export type DeviceMode = 'terminal' | 'management'

export default function DeviceSetupPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<DeviceMode | null>(null)

  function handleContinue() {
    if (!selected) return
    localStorage.setItem(DEVICE_MODE_KEY, selected)
    if (selected === 'terminal') {
      // Check if a location is already saved
      const savedLoc = localStorage.getItem('stitch_active_location')
      navigate(savedLoc ? '/pin' : '/location-setup', { replace: true })
    } else {
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="bg-white rounded-2xl px-6 py-3 inline-block shadow-lg mb-10">
        <img src="/stitch-logo.png" alt="Stitch" className="h-10 object-contain" />
      </div>

      <h1 className="text-white text-2xl font-bold mb-2 text-center">How will you use Stitch on this device?</h1>
      <p className="text-white/50 text-sm mb-8 text-center">You only need to set this up once.</p>

      <div className="w-full max-w-sm space-y-4">
        {/* Shop terminal */}
        <button
          onClick={() => setSelected('terminal')}
          className={`w-full rounded-2xl p-5 text-left border-2 transition-all ${
            selected === 'terminal'
              ? 'bg-white border-white'
              : 'bg-white/10 border-white/20 hover:bg-white/15'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-xl mt-0.5 ${selected === 'terminal' ? 'bg-navy' : 'bg-white/10'}`}>
              <Monitor size={22} className={selected === 'terminal' ? 'text-white' : 'text-white'} />
            </div>
            <div>
              <p className={`font-bold text-base ${selected === 'terminal' ? 'text-navy' : 'text-white'}`}>
                Shop POS terminal
              </p>
              <p className={`text-sm mt-1 ${selected === 'terminal' ? 'text-navy/70' : 'text-white/50'}`}>
                Process orders and payments
              </p>
            </div>
          </div>
        </button>

        {/* Management */}
        <button
          onClick={() => setSelected('management')}
          className={`w-full rounded-2xl p-5 text-left border-2 transition-all ${
            selected === 'management'
              ? 'bg-white border-white'
              : 'bg-white/10 border-white/20 hover:bg-white/15'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-xl mt-0.5 ${selected === 'management' ? 'bg-navy' : 'bg-white/10'}`}>
              <BarChart2 size={22} className="text-white" />
            </div>
            <div>
              <p className={`font-bold text-base ${selected === 'management' ? 'text-navy' : 'text-white'}`}>
                Management Device
              </p>
              <p className={`text-sm mt-1 ${selected === 'management' ? 'text-navy/70' : 'text-white/50'}`}>
                Sales, reports and team overview
              </p>
            </div>
          </div>
        </button>
      </div>

      <button
        onClick={handleContinue}
        disabled={!selected}
        className="mt-8 w-full max-w-sm py-4 rounded-2xl bg-tan text-navy font-bold text-base disabled:opacity-30 transition-opacity"
      >
        Continue →
      </button>
    </div>
  )
}
