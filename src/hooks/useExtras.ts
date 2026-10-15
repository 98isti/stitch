import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

export interface Extra {
  name: string
  price: number
}

export function useExtras(accountId: string | null): Extra[] {
  const [extras, setExtras] = useState<Extra[]>([])

  useEffect(() => {
    if (!accountId) return
    const unsub = onSnapshot(doc(db, 'accounts', accountId), snap => {
      if (snap.exists()) setExtras(snap.data().extras ?? [])
    })
    return unsub
  }, [accountId])

  return extras
}
