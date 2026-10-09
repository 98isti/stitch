import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'

export function useDailyRevenue(accountId: string | null, locationName: string | null) {
  const [revenue, setRevenue] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accountId) return
    const today = new Date().toISOString().split('T')[0]
    const q = query(
      collection(db, 'accounts', accountId, 'orders'),
      where('orderDate', '==', today),
      orderBy('orderDate')
    )
    getDocs(q).then(snap => {
      const all = snap.docs.map(d => d.data())
      const filtered = locationName ? all.filter(o => o.location === locationName) : all
      const total = filtered.reduce((s, o) => s + (o.orderAmount ?? 0), 0)
      setRevenue(total)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [accountId, locationName])

  return { revenue, loading }
}
