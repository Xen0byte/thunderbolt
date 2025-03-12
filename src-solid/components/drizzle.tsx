import { DrizzleContextType } from '@/types'
import { createContext, JSX, useContext } from 'solid-js'

const DrizzleContext = createContext<DrizzleContextType>()

export function DrizzleProvider(props: { context: DrizzleContextType; children: JSX.Element }) {
  return <DrizzleContext.Provider value={props.context}>{props.children}</DrizzleContext.Provider>
}

export function useDrizzle() {
  const context = useContext(DrizzleContext)

  if (!context) {
    throw new Error('useDrizzle must be used within a DrizzleProvider')
  }

  return context
}
