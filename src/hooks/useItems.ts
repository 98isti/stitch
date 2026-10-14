import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'

export interface PriceItem {
  id: string
  itemName: string
  itemCategoryName: string
  itemSubCategoryName: string | null
  itemPrice: number
  shopType?: string
  components?: string[]  // physical pieces e.g. ["Jacket","Trousers"]
}

export function useItems(accountId: string | null, shopType?: string) {
  const [allItems, setAllItems] = useState<PriceItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accountId) return
    const q = query(
      collection(db, 'accounts', accountId, 'items'),
      orderBy('itemCategoryName'),
    )
    getDocs(q).then(snap => {
      setAllItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as PriceItem)))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [accountId])

  const items = shopType
    ? allItems.filter(i => !i.shopType || i.shopType === shopType)
    : allItems

  // Group items by category → subCategory
  function getItemsForCategory(categoryName: string) {
    return items.filter(i => i.itemCategoryName === categoryName)
  }

  function getSubCategories(categoryName: string): string[] {
    const subs = items
      .filter(i => i.itemCategoryName === categoryName && i.itemSubCategoryName)
      .map(i => i.itemSubCategoryName!)
    return [...new Set(subs)].sort()
  }

  return { items, loading, getItemsForCategory, getSubCategories }
}
