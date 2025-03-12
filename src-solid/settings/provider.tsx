import { createContext, createResource, JSX, Show, useContext } from 'solid-js'

import { getSettings as dalGetSettings, setSettings as dalSetSettings } from '@/dal'
import { Settings } from '@/types'
import { useDrizzle } from '../components/drizzle'

type SettingsContextType = {
  settings: Settings
  setSettings: (updatedSettings: Settings) => Promise<void>
}

const SettingsContext = createContext<SettingsContextType>()

export function SettingsProvider(props: { key: string; children: JSX.Element }) {
  const drizzleContext = useDrizzle()

  const [settings, { mutate, refetch }] = createResource<Settings>(async () => {
    const obj = await dalGetSettings<any>(drizzleContext.db, props.key)
    return obj
  })

  const setSettings = async (updatedSettings: Settings) => {
    try {
      mutate(updatedSettings)
      await dalSetSettings(drizzleContext.db, props.key, updatedSettings)
    } catch (error) {
      refetch()
      console.error(error)
    }
  }

  return (
    <Show when={settings()}>
      <SettingsContext.Provider
        value={{
          get settings() {
            return settings()!
          },
          setSettings,
        }}
      >
        {props.children}
      </SettingsContext.Provider>
    </Show>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)

  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }

  return context
}
