import './index.css'

import { JSXElement, onMount } from 'solid-js'

import { appDataDir } from '@tauri-apps/api/path'
import { initDb } from './lib/commands'
import { createAppDataDir } from './lib/fs'
import { createTray } from './lib/tray'

const init = async () => {
  createTray()
  createAppDataDir()

  const dataDir = await appDataDir()
  const dbPath = `sqlite://${dataDir}/local.db?mode=rwc`
  console.log('Initializing database in', dbPath)
  initDb(dbPath)
}

export default function App({ children }: { children?: JSXElement }) {
  onMount(() => {
    init()
  })

  return <main class="flex h-screen w-screen">{children}</main>
}
