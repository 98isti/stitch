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

  // Read template items from Firestore itemTemplates collection
  const templateSnap = await getDocs(
    collection(db, 'itemTemplates', shopType, 'items')
  )
  if (templateSnap.empty) {
    console.warn(`seedItemsForLocation: no template found for shopType=${shopType}`)
    return { seeded: 0, skipped: false }
  }

  // Write items for this location in batches
  const BATCH_SIZE = 400
  const docs = templateSnap.docs
  let seeded = 0

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE)
    await Promise.all(chunk.map(d => {
      const data = d.data()
      return addDoc(collection(db, 'accounts', accountId, 'items'), {
        ...data,
        locationId,
        ...(locationName ? { locationName } : {}),
        shopType,
        createdAt: serverTimestamp(),
        source: 'template',
      })
    }))
    seeded += chunk.length
  }

  // Also seed categories
  await seedCategoriesForLocation(accountId, locationId, shopType)

  return { seeded, skipped: false }
}

async function seedCategoriesForLocation(
  accountId: string,
  locationId: string,
  shopType: string
) {
  const existing = await getDocs(query(
    collection(db, 'accounts', accountId, 'categories'),
    where('locationId', '==', locationId),
    limit(1)
  ))
  if (!existing.empty) return

  const templateCats = await getDocs(
    collection(db, 'itemTemplates', shopType, 'categories')
  )
  await Promise.all(templateCats.docs.map(d =>
    addDoc(collection(db, 'accounts', accountId, 'categories'), {
      ...d.data(),
      locationId,
      shopType,
      createdAt: serverTimestamp(),
      source: 'template',
    })
  ))
}
