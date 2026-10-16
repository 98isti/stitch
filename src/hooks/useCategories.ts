import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore'
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
    if (!accountId) return
    setLoading(true)
    const constraints: any[] = [orderBy('categoryName')]
    if (locationId) constraints.unshift(where('locationId', '==', locationId))
    const q = query(collection(db, 'accounts', accountId, 'categories'), ...constraints)
    getDocs(q).then(snap => {
      setAllCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [accountId, locationId])

  const categories = shopType
    ? allCategories.filter(c => !c.shopType || c.shopType === shopType)
    : allCategories

  return { categories, loading }
}
