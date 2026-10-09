import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'

export interface Location {
  id: string
  name: string
  address?: string
  streetAddress?: string
  suburb?: string
  state?: string
  country?: string
  phone?: string
  shopType?: string
  orderPrefix?: string
}

const LS_KEY = 'stitch_active_location'

export function useLocations(accountId: string | null) {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [activeLocation, setActiveLocationState] = useState<Location | null>(null)

  useEffect(() => {
    if (!accountId) return
    const q = query(collection(db, 'accounts', accountId, 'locations'), orderBy('name'))
    getDocs(q).then(snap => {
      const locs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Location))
      setLocations(locs)
      if (locs.length > 0) {
        // Restore from localStorage
        const saved = localStorage.getItem(LS_KEY)
        const restored = saved ? locs.find(l => l.id === saved) : null
        setActiveLocationState(restored ?? locs[0])
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [accountId])

  function setActiveLocation(loc: Location) {
    setActiveLocationState(loc)
    localStorage.setItem(LS_KEY, loc.id)
  }

  return { locations, loading, activeLocation, setActiveLocation }
}
