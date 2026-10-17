import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'

export function useDailyRevenue(accountId: string | null, locationName: string | null) {
  const [revenue, setRevenue] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accountId) return
    // Use local date (device timezone) not UTC
    const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time
    const q = query(
      collection(db, 'accounts', accountId, 'payments'),
      where('paidDate', '==', today)
    )
    getDocs(q).then(snap => {
      const all = snap.docs.map(d => d.data())
      const filtered = locationName ? all.filter(p => p.location === locationName) : all
      const total = filtered.reduce((s, p) => s + (p.amount ?? 0), 0)
      setRevenue(total)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [accountId, locationName])

  return { revenue, loading }
}
