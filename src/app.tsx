import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'

import ChatDetailPage from '@/chats/detail'
import ChatLayout from '@/chats/layout'
import Layout from '@/layout'
import AccountsSettingsPage from '@/settings/accounts'
import Settings from '@/settings/index'
import ModelsSettingsPage from '@/settings/models'
import { useEffect, useState } from 'react'
import ChatNewPage from './chats/new'
import { initializeDrizzleDatabase } from './db/database'
import { migrate } from './db/migrate'
import { DrizzleProvider } from './db/provider'
import { createAppDataDir } from './lib/fs'
import { createTray } from './lib/tray'
import SettingsLayout from './settings/layout'
import { SettingsProvider } from './settings/provider'
import { DrizzleContextType } from './types'
import UiKitPage from './ui-kit'

const queryClient = new QueryClient()

const init = async () => {
  createTray()
  createAppDataDir()

  const { db, sqlite } = await initializeDrizzleDatabase()

  await migrate({ sqlite })

  return {
    db,
    sqlite,
  }
}

export const App = () => {
  const [context, setContext] = useState<DrizzleContextType>()

  useEffect(() => {
    init().then(setContext)
  }, [])

  if (!context) {
    return <div>Loading...</div>
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DrizzleProvider context={context}>
        <SettingsProvider section="main">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                {/* Home routes with HomeLayout */}
                <Route element={<ChatLayout />}>
                  <Route index element={<ChatNewPage />} />
                  <Route path="chats/:chatThreadId" element={<ChatDetailPage />} />
                </Route>

                {/* Settings routes with SettingsLayout */}
                <Route path="settings" element={<SettingsLayout />}>
                  <Route index element={<Settings />} />
                  <Route path="accounts" element={<AccountsSettingsPage />} />
                  <Route path="models" element={<ModelsSettingsPage />} />
                </Route>

                <Route path="ui-kit" element={<UiKitPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </SettingsProvider>
      </DrizzleProvider>
    </QueryClientProvider>
  )
}
