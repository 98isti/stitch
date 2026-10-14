import { useEffect, useState } from 'react'
import { collection, getDocsFromServer, query, orderBy, where } from 'firebase/firestore'
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
    if (!accountId) return
    setLoading(true)

    // If locationId is set, filter by it (location-specific items)
    // Otherwise fall back to shopType filter (backward compat for existing items)
    const q = locationId
      ? query(
          collection(db, 'accounts', accountId, 'items'),
          where('locationId', '==', locationId),
          orderBy('itemCategoryName'),
        )
      : query(
          collection(db, 'accounts', accountId, 'items'),
          orderBy('itemCategoryName'),
        )

    getDocsFromServer(q).then(snap => {
      let items = snap.docs.map(d => ({ id: d.id, ...d.data() } as PriceItem))
      // When using shopType fallback, filter client-side
      if (!locationId && shopType) {
        items = items.filter(i => !i.shopType || i.shopType === shopType)
      }
      setAllItems(items)
      setLoading(false)
    }).catch(() => setLoading(false))
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
