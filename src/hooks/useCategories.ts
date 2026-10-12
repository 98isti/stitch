import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'

export interface Category {
  id: string
  categoryName: string
  shopType?: string
}

export function useCategories(accountId: string | null, shopType?: string) {
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accountId) return
    const q = query(
      collection(db, 'accounts', accountId, 'categories'),
      orderBy('categoryName')
    )
    getDocs(q).then(snap => {
      setAllCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [accountId])

  const categories = shopType
    ? allCategories.filter(c => !c.shopType || c.shopType === shopType)
    : allCategories

  return { categories, loading }
}
