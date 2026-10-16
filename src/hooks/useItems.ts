import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'

export interface PriceItem {
  id: string
  itemName: string
  itemCategoryName: string
  itemSubCategoryName: string | null
  itemPrice: number
  shopType?: string
  locationId?: string
  components?: string[]  // physical pieces e.g. ["Jacket","Trousers"]
}

export function useItems(accountId: string | null, locationId?: string | null, shopType?: string) {
  const [allItems, setAllItems] = useState<PriceItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Wait for locationId to resolve — don't fetch with null (loads all locations)
    if (!accountId || locationId === null) return
    setLoading(true)

    const q = locationId
      ? query(collection(db, 'accounts', accountId, 'items'), where('locationId', '==', locationId))
      : query(collection(db, 'accounts', accountId, 'items'))

    // Timeout fallback — unblock UI if Firestore hangs
    const timeout = setTimeout(() => setLoading(false), 10_000)

    // getDocs uses Firestore cache first — faster than getDocsFromServer on repeat views
    getDocs(q).then(snap => {
      clearTimeout(timeout)
      let items = snap.docs.map(d => ({ id: d.id, ...d.data() } as PriceItem))
      if (!locationId && shopType) {
        items = items.filter(i => !i.shopType || i.shopType === shopType)
      }
      setAllItems(items)
      setLoading(false)
    }).catch(() => { clearTimeout(timeout); setLoading(false) })

    return () => clearTimeout(timeout)
  }, [accountId, locationId])

  function getItemsForCategory(categoryName: string) {
    return allItems.filter(i => i.itemCategoryName === categoryName)
  }

  function getSubCategories(categoryName: string): string[] {
    const subs = allItems
      .filter(i => i.itemCategoryName === categoryName && i.itemSubCategoryName)
      .map(i => i.itemSubCategoryName!)
    return [...new Set(subs)].sort()
  }

  return { items: allItems, loading, getItemsForCategory, getSubCategories }
}
