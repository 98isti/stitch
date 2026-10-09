import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

export interface AccountProfile {
  businessName: string
  abn?: string
  email?: string
  logoUrl?: string
}

export function useAccountProfile(accountId: string | null) {
  const [profile, setProfile] = useState<AccountProfile | null>(null)

  useEffect(() => {
    if (!accountId) return
    getDoc(doc(db, 'accounts', accountId)).then(snap => {
      if (snap.exists()) setProfile(snap.data() as AccountProfile)
    }).catch(() => {})
  }, [accountId])

  return profile
}
