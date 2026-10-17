import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useLocations } from '../hooks/useLocations'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
type Day = typeof DAYS[number]

interface DaySlot { customerService: string; tailor: string }
type LocationRoster = Record<Day, DaySlot>

function emptyRoster(): LocationRoster {
  const r = {} as LocationRoster
  DAYS.forEach(d => { r[d] = { customerService: '', tailor: '' } })
  return r
}

function dayLabel(d: Day) {
  return d.charAt(0).toUpperCase() + d.slice(1)
}

export default function RosterPage() {
  const { accountId } = useAuth()
  const { locations } = useLocations(accountId)
  const navigate = useNavigate()

  // roster[locationId] = LocationRoster
  const [roster, setRoster] = useState<Record<string, LocationRoster>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load roster docs for all locations
  useEffect(() => {
    if (!accountId || locations.length === 0) return
    setLoading(true)
    Promise.all(
      locations.map(async loc => {
        const snap = await getDoc(doc(db, 'accounts', accountId, 'roster', loc.id))
        return { id: loc.id, data: snap.exists() ? snap.data() as LocationRoster : emptyRoster() }
      })
    ).then(results => {
      const map: Record<string, LocationRoster> = {}
      results.forEach(r => { map[r.id] = r.data })
      setRoster(map)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [accountId, locations])

  function updateSlot(locId: string, day: Day, role: keyof DaySlot, value: string) {
    setRoster(prev => ({
      ...prev,
      [locId]: {
        ...prev[locId],
        [day]: { ...prev[locId][day], [role]: value }
      }
    }))
    setSaved(false)
  }

  async function handleSave() {
    if (!accountId) return
    setSaving(true)
    try {
      await Promise.all(
        locations.map(loc =>
          setDoc(doc(db, 'accounts', accountId, 'roster', loc.id), roster[loc.id] ?? emptyRoster())
        )
      )
      setSaved(true)
    } catch (e) {
      console.error('Roster save failed:', e)
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 flex-shrink-0">
        <button
          onClick={() => navigate('/mgmt-more')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-200"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>

        <h1 className="text-lg font-bold text-gray-900">Roster</h1>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded-full bg-white shadow-sm border border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : locations.length === 0 ? (
          <p className="text-center text-gray-400 text-sm mt-12">No locations found</p>
        ) : (
          locations.map(loc => {
            const locRoster = roster[loc.id] ?? emptyRoster()
            return (
              <div key={loc.id}>
                {/* Location header */}
                <div className="bg-gray-300 rounded-xl px-4 py-3 mb-0">
                  <span className="text-xl font-bold text-gray-800">{loc.name}</span>
                </div>

                {/* Table */}
                <div className="bg-white rounded-b-xl overflow-hidden shadow-sm border border-gray-200 border-t-0">
                  {/* Column headers */}
                  <div className="flex bg-gray-100 border-b border-gray-200">
                    <div className="w-28 px-3 py-2.5 text-xs font-semibold text-gray-600">Day</div>
                    <div className="flex-1 px-2 py-2.5 text-xs font-semibold text-gray-600 leading-tight">Customer<br />Service</div>
                    <div className="flex-1 px-2 py-2.5 text-xs font-semibold text-gray-600">Tailor</div>
                  </div>

                  {/* Day rows */}
                  {DAYS.map((day, i) => (
                    <div key={day} className={`flex items-center ${i < DAYS.length - 1 ? 'border-b border-gray-100' : ''}`}>
                      {/* Day label */}
                      <div className="w-28 px-3 py-2.5 text-sm italic text-gray-400 flex-shrink-0">
                        {dayLabel(day)}
                      </div>

                      {/* Customer Service input */}
                      <div className="flex-1 px-1 py-1.5">
                        <input
                          type="text"
                          value={locRoster[day]?.customerService ?? ''}
                          onChange={e => updateSlot(loc.id, day, 'customerService', e.target.value)}
                          placeholder="Enter Name"
                          className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-blue-400 bg-white"
                        />
                      </div>

                      {/* Tailor input */}
                      <div className="flex-1 px-1 py-1.5 pr-2">
                        <input
                          type="text"
                          value={locRoster[day]?.tailor ?? ''}
                          onChange={e => updateSlot(loc.id, day, 'tailor', e.target.value)}
                          placeholder="Enter Name"
                          className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-blue-400 bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
