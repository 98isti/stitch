import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'

export interface Category {
  id: string
  categoryName: string
  shopType?: string
}

export function useCategories(accountId: string | null, shopType?: string, locationId?: string | null) {
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Wait for locationId to resolve — don't fetch with null (would load all locations)
    if (!accountId || locationId === null) return
    setLoading(true)

    const q = locationId
      ? query(collection(db, 'accounts', accountId, 'categories'), where('locationId', '==', locationId))
      : query(collection(db, 'accounts', accountId, 'categories'))

    // Timeout fallback — if Firestore hangs, unblock the UI after 10s
    const timeout = setTimeout(() => setLoading(false), 10_000)

    getDocs(q).then(snap => {
      clearTimeout(timeout)
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Category))
        .sort((a, b) => a.categoryName.localeCompare(b.categoryName))
      setAllCategories(sorted)
      setLoading(false)
    }).catch(() => { clearTimeout(timeout); setLoading(false) })

    return () => clearTimeout(timeout)
  }, [accountId, locationId])

  const categories = shopType
    ? allCategories.filter(c => !c.shopType || c.shopType === shopType)
    : allCategories

  return { categories, loading }
}
