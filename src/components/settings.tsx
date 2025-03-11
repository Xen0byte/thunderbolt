import { createContext, createResource, JSX, useContext } from 'solid-js'
import { z } from 'zod'

import { setSettings as dalSetSetting, getSettings } from '@/dal'
import { getPath, setPath } from '@/lib/utils'
import { Settings } from '@/types'
import { useDrizzle } from './drizzle'

export const AccountSettingsSchema = z.object({
  hostname: z.string().min(1),
  port: z.number().int().positive(),
  username: z.string().min(1),
  password: z.string().min(1),
})

export const ModelsSettingsSchema = z.object({
  openai_api_key: z.string().min(1),
})

export const SettingsSchema = z.object({
  account: AccountSettingsSchema.optional(),
  models: ModelsSettingsSchema.optional(),
})

type SettingsContextType = {
  settings: Settings
  set: (path: string, value: any) => Promise<void>
  get: <T>(path?: string, defaultValue?: T) => T | undefined
  loading: boolean
  error: any
}

const SettingsContext = createContext<SettingsContextType>()

export function SettingsProvider(props: { key: string; children: JSX.Element }) {
  const drizzleContext = useDrizzle()

  const [settings, { mutate, refetch }] = createResource<Settings>(
    async () => {
      const obj = await getSettings<any>(drizzleContext.db, props.key)
      return obj || {}
    },
    {
      initialValue: {},
    }
  )

  const setSettingsValue = async (path: string, value: any) => {
    if (!settings()) {
      throw new Error('Cannot set settings before they are loaded')
    }

    const updatedSettings = { ...settings() } as Settings
    setPath(updatedSettings, path, value)

    try {
      // Validate the updated settings
      SettingsSchema.parse(updatedSettings)

      // Update local state immediately (optimistic)
      mutate(updatedSettings)

      await dalSetSetting(drizzleContext.db, props.key, updatedSettings)
    } catch (error) {
      // Revert optimistic update on error
      console.error('Settings validation error:', error)
      await refetch()
      throw error
    }
  }

  const getSettingsValue = <T,>(path?: string, defaultValue?: T): T | undefined => {
    const currentSettings = settings()

    if (!currentSettings) {
      console.error('Cannot get settings before they are loaded', currentSettings)
      throw new Error('Cannot get settings before they are loaded')
    }

    return getPath(currentSettings, path, defaultValue)
  }

  const contextValue = {
    // Use a getter to make settings reactive
    get settings() {
      return settings()
    },
    set: setSettingsValue,
    get: getSettingsValue,
    // Make these reactive too
    get loading() {
      return settings.loading
    },
    get error() {
      return settings.error
    },
  }

  return <SettingsContext.Provider value={contextValue}>{props.children}</SettingsContext.Provider>
}

export function useSettings() {
  const context = useContext(SettingsContext)

  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }

  return context
}
