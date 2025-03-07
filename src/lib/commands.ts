import { invoke } from '@tauri-apps/api/core'

/**
 * Get a setting value from the database
 * @param id The setting ID
 * @returns The setting value or null if not found
 */
export async function getSetting(id: string): Promise<string | null> {
  try {
    const result = await invoke<{ id: string; value: string } | null>('get_setting', { id })
    return result ? result.value : null
  } catch (error) {
    console.error('Error getting setting:', error)
    return null
  }
}

/**
 * Set a setting value in the database
 * @param id The setting ID
 * @param value The setting value
 * @returns True if successful, false otherwise
 */
export async function setSetting(key: string, value: string): Promise<boolean> {
  try {
    await invoke('set_setting', { key, value })
    return true
  } catch (error) {
    console.error('Error setting setting:', error)
    return false
  }
}

export async function initDb(path: string): Promise<void> {
  await invoke('init_db', { path })
}
