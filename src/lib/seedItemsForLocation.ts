/**
 * seedItemsForLocation — copies the default item list from itemTemplates
 * into an account's items collection for a specific location.
 *
 * Called during onboarding (first location) and when a new location is added.
 * Idempotent: skips if items already exist for this locationId.
 */

import {
  collection, getDocs, addDoc, query, where, limit,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './firebase'

export async function seedItemsForLocation(
  accountId: string,
  locationId: string,
  shopType: 'alterations' | 'dryCleaning'
): Promise<{ seeded: number; skipped: boolean }> {

  // Check if items already exist for this location
  const existing = await getDocs(query(
    collection(db, 'accounts', accountId, 'items'),
    where('locationId', '==', locationId),
    limit(1)
  ))
  if (!existing.empty) {
    return { seeded: 0, skipped: true }
  }

  // Read template items from bundled JSON (not Firestore — ensures subCategory is always present)
  const templateFile = shopType === 'dryCleaning' ? '/templates/dry-cleaning.json' : '/templates/alterations.json'
  let templateData: { categories: string[]; items: any[] }
  try {
    const res = await fetch(templateFile)
    templateData = await res.json()
  } catch (e) {
    console.warn(`seedItemsForLocation: failed to load template JSON for shopType=${shopType}`, e)
    return { seeded: 0, skipped: false }
  }

  const templateItems = templateData.items ?? []
  if (!templateItems.length) {
    console.warn(`seedItemsForLocation: empty template for shopType=${shopType}`)
    return { seeded: 0, skipped: false }
  }

  // Write items for this location in batches
  const BATCH_SIZE = 400
  let seeded = 0

  for (let i = 0; i < templateItems.length; i += BATCH_SIZE) {
    const chunk = templateItems.slice(i, i + BATCH_SIZE)
    await Promise.all(chunk.map((item: any) =>
      addDoc(collection(db, 'accounts', accountId, 'items'), {
        ...item,
        locationId,
        shopType,
        createdAt: serverTimestamp(),
        source: 'template',
      })
    ))
    seeded += chunk.length
  }

  // Also seed categories from JSON
  await seedCategoriesForLocation(accountId, locationId, shopType, templateData.categories ?? [])

  return { seeded, skipped: false }
}

async function seedCategoriesForLocation(
  accountId: string,
  locationId: string,
  shopType: string,
  categories: string[] = []
) {
  const existing = await getDocs(query(
    collection(db, 'accounts', accountId, 'categories'),
    where('locationId', '==', locationId),
    limit(1)
  ))
  if (!existing.empty) return

  if (!categories.length) return

  await Promise.all(categories.map((name: string) =>
    addDoc(collection(db, 'accounts', accountId, 'categories'), {
      name,
      locationId,
      shopType,
      createdAt: serverTimestamp(),
      source: 'template',
    })
  ))
}
