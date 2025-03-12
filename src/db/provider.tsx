import { DrizzleContextType } from '@/types'
import { createContext, ReactNode, useContext } from 'react'

const DrizzleContext = createContext<DrizzleContextType | undefined>(undefined)

export function DrizzleProvider({ context, children }: { context: DrizzleContextType; children: ReactNode }) {
  return <DrizzleContext.Provider value={context}>{children}</DrizzleContext.Provider>
}

export function useDrizzle() {
  const context = useContext(DrizzleContext)

  if (!context) {
    throw new Error('useDrizzle must be used within a DrizzleProvider')
  }

  return context
}
