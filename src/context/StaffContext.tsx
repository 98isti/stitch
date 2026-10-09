import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface StaffSession {
  id: string
  name: string
  role: string
}

interface StaffContextType {
  staff: StaffSession | null
  setStaff: (s: StaffSession | null) => void
  clearStaff: () => void
}

const StaffContext = createContext<StaffContextType>({
  staff: null,
  setStaff: () => {},
  clearStaff: () => {},
})

export function StaffProvider({ children }: { children: ReactNode }) {
  const [staff, setStaffState] = useState<StaffSession | null>(() => {
    try {
      const saved = sessionStorage.getItem('***')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  function setStaff(s: StaffSession | null) {
    setStaffState(s)
    if (s) sessionStorage.setItem('***', JSON.stringify(s))
    else sessionStorage.removeItem('***')
  }

  function clearStaff() { setStaff(null) }

  return (
    <StaffContext.Provider value={{ staff, setStaff, clearStaff }}>
      {children}
    </StaffContext.Provider>
  )
}

export const useStaff = () => useContext(StaffContext)
