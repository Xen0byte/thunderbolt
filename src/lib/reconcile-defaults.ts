import type { AnyDrizzleDatabase } from '@/db/database-interface'
import { createSetting } from '@/dal'
import { eq, and } from 'drizzle-orm'
import type { SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core'
import { v7 as uuidv7 } from 'uuid'
import { modelsTable, promptsTable, settingsTable, tasksTable } from '../db/tables'
import { defaultAutomations, hashPrompt } from '../defaults/automations'
import { defaultModels, hashModel } from '../defaults/models'
import { defaultSettings, hashSetting } from '../defaults/settings'
import { defaultTasks, hashTask } from '../defaults/tasks'

/**
 * Generic function to reconcile defaults into a table
 * Inserts new defaults and updates unmodified existing ones
 * @param db - The database instance
 * @param table - The database table to reconcile
 * @param defaults - Array of default items to reconcile
 * @param hashFn - Function to compute hash of an item
 * @param userId - The current user's ID
 * @param keyField - Name of the primary key field (defaults to 'id')
 */
export const reconcileDefaultsForTable = async <T extends { defaultHash: string | null }>(
  db: AnyDrizzleDatabase,
  table: SQLiteTableWithColumns<any>,
  defaults: readonly T[],
  hashFn: (item: any) => string,
  userId: string,
  keyField: string = 'id',
) => {
  // Debug: Check what's in the table for this user
  const allForUser = await db.select().from(table).where(eq(table.userId, userId))
  console.warn(`[reconcileDefaults] Table has ${allForUser.length} records for user ${userId}`)

  for (const defaultItem of defaults) {
    const keyValue = (defaultItem as any)[keyField]
    // Check for existing record by both id AND userId
    const existing = await db
      .select()
      .from(table)
      .where(and(eq(table[keyField], keyValue), eq(table.userId, userId)))
      .get()

    if (!existing) {
      console.warn(`[reconcileDefaults] Inserting default ${keyValue} for user ${userId}`)
      // New default for this user - insert with computed hash and userId
      await db.insert(table).values({
        ...defaultItem,
        userId,
        defaultHash: hashFn(defaultItem),
      })
    } else {
      // Exists for this user - check if user modified by comparing hashes
      const currentHash = hashFn(existing)
      const defaultHashValue = hashFn(defaultItem)

      if (!existing.defaultHash) {
        // No defaultHash - set it to the default hash to enable modification tracking
        // Only update if the current content matches what we expect for defaults
        if (currentHash === defaultHashValue) {
          await db
            .update(table)
            .set({ defaultHash: defaultHashValue })
            .where(and(eq(table[keyField], keyValue), eq(table.userId, userId)))
        }
      } else if (currentHash === existing.defaultHash && defaultHashValue !== existing.defaultHash) {
        // User hasn't modified the data AND the default template has changed
        // Safe to update to new default
        await db
          .update(table)
          .set({
            ...defaultItem,
            userId,
            defaultHash: defaultHashValue,
          })
          .where(and(eq(table[keyField], keyValue), eq(table.userId, userId)))
      }
      // If currentHash !== existing.defaultHash, user has modified - skip update
      // If defaultHashValue === existing.defaultHash, nothing changed - skip update
    }
  }
}

export const reconcileDefaults = async (db: AnyDrizzleDatabase, userId: string) => {
  // AI models
  await reconcileDefaultsForTable(db, modelsTable, defaultModels, hashModel, userId)

  // Tasks
  await reconcileDefaultsForTable(db, tasksTable, defaultTasks, hashTask, userId)

  // Automations (Prompts)
  await reconcileDefaultsForTable(db, promptsTable, defaultAutomations, hashPrompt, userId)

  // Settings
  await reconcileDefaultsForTable(db, settingsTable, defaultSettings, hashSetting, userId, 'key')

  // Initialize anonymous ID for analytics (unique per user)
  await createSetting('anonymous_id', uuidv7(), userId)
}
