import { createContext, useContext } from 'react'

export const ManagementContext = createContext(false)
export const useIsManagement = () => useContext(ManagementContext)
