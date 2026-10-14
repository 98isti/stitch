import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
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
  businessName?: string
  abn?: string
  businessPhone?: string
}

const LS_KEY = 'stitch_active_location'

export function useLocations(accountId: string | null) {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [activeLocation, setActiveLocationState] = useState<Location | null>(null)

  useEffect(() => {
    if (!accountId) return
    const q = query(collection(db, 'accounts', accountId, 'locations'), orderBy('name'))
    const unsub = onSnapshot(q, snap => {
      const locs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Location))
      setLocations(locs)
      setActiveLocationState(prev => {
        if (prev) return locs.find(l => l.id === prev.id) ?? prev
        const saved = localStorage.getItem(LS_KEY)
        const restored = saved ? locs.find(l => l.id === saved) : null
        return restored ?? locs[0] ?? null
      })
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [accountId])

  function setActiveLocation(loc: Location) {
    setActiveLocationState(loc)
    localStorage.setItem(LS_KEY, loc.id)
  }

  return { locations, loading, activeLocation, setActiveLocation }
}
