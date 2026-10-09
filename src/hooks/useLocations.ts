import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'

export interface Location {
  id: string
  name: string
  address: string
  shopType: 'alterations' | 'dryCleaning'
}

export function useLocations(accountId: string | null) {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [activeLocation, setActiveLocation] = useState<Location | null>(null)

  useEffect(() => {
    if (!accountId) return
    const q = query(collection(db, 'accounts', accountId, 'locations'), orderBy('name'))
    getDocs(q).then(snap => {
      const locs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Location))
      setLocations(locs)
      if (locs.length > 0) setActiveLocation(locs[0])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [accountId])

  return { locations, loading, activeLocation, setActiveLocation }
}
