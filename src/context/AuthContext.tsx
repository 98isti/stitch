import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  accountId: string | null
  onboarded: boolean
  refreshOnboarded: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null, loading: true, accountId: null, onboarded: false, refreshOnboarded: () => {}
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [onboarded, setOnboarded] = useState(false)

  async function checkOnboarded(uid: string) {
    try {
      const snap = await getDoc(doc(db, 'users', uid))
      setOnboarded(snap.exists() && snap.data()?.onboarded === true)
    } catch {
      setOnboarded(false)
    }
  }

  function refreshOnboarded() {
    if (user) checkOnboarded(user.uid)
  }

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) await checkOnboarded(u.uid)
      else setOnboarded(false)
      setLoading(false)
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, accountId: user?.uid ?? null, onboarded, refreshOnboarded }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
