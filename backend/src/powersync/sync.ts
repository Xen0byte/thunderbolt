import { syncDataTable } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import type { PgDatabase } from 'drizzle-orm/pg-core'

export type CrudOperation = {
  op: 'PUT' | 'PATCH' | 'DELETE'
  table: string
  id: string
  data?: Record<string, unknown>
}

/**
 * Whitelist of client-side table names that can be synced via PowerSync.
 *
 * Even though we store all synced data in a generic `sync_data` table,
 * this whitelist provides:
 * - Security: Prevents clients from syncing arbitrary/malicious table names
 * - Explicit control: Only tables listed here will be accepted
 *
 * Add new table names here as you enable sync for more frontend tables.
 */
const ALLOWED_TABLES = [
  'settings',
  'chat_threads',
  'chat_messages',
  'tasks',
  'models',
  'mcp_servers',
  'prompts',
  'triggers',
] as const
type AllowedTable = (typeof ALLOWED_TABLES)[number]

const isAllowedTable = (table: string): table is AllowedTable => {
  return ALLOWED_TABLES.includes(table as AllowedTable)
}

/**
 * Apply a CRUD operation from PowerSync to the generic sync_data table.
 *
 * All synced data is stored in a single table with columns:
 * - id: The record's unique identifier
 * - user_id: For multi-tenant isolation
 * - table_name: Which client-side table this belongs to (e.g., 'models')
 * - data: The actual record data as JSON
 *
 * PowerSync operations:
 * - PUT: Insert or replace (upsert)
 * - PATCH: Merge with existing data
 * - DELETE: Mark as deleted in the data JSON
 */
export const applyOperation = async (database: unknown, userId: string, operation: CrudOperation): Promise<void> => {
  const { op, table, id, data } = operation
  const db = database as PgDatabase<never, never, never>

  // Validate table is in whitelist
  if (!isAllowedTable(table)) {
    throw new Error(`Table '${table}' is not allowed for sync`)
  }

  switch (op) {
    case 'PUT': {
      // Upsert - insert or update on conflict
      await db
        .insert(syncDataTable)
        .values({
          id,
          userId,
          tableName: table,
          data: data ?? {},
        })
        .onConflictDoUpdate({
          target: [syncDataTable.id, syncDataTable.tableName, syncDataTable.userId],
          set: {
            data: data ?? {},
          },
        })
      break
    }

    case 'PATCH': {
      if (!data || Object.keys(data).length === 0) {
        return // Nothing to update
      }

      // For PATCH, we need to merge with existing data
      // First get existing record, then merge and update
      const existing = await db
        .select()
        .from(syncDataTable)
        .where(and(eq(syncDataTable.id, id), eq(syncDataTable.tableName, table), eq(syncDataTable.userId, userId)))
        .limit(1)

      const existingData = (existing[0]?.data as Record<string, unknown>) ?? {}
      const mergedData = { ...existingData, ...data }

      if (existing.length > 0) {
        await db
          .update(syncDataTable)
          .set({ data: mergedData })
          .where(and(eq(syncDataTable.id, id), eq(syncDataTable.tableName, table), eq(syncDataTable.userId, userId)))
      } else {
        // If record doesn't exist, create it
        await db.insert(syncDataTable).values({
          id,
          userId,
          tableName: table,
          data: mergedData,
        })
      }
      break
    }

    case 'DELETE': {
      // Soft delete - mark as deleted in the data JSON
      // This follows the ticket requirement: "Rows are never deleted - only marked as deleted"
      const existing = await db
        .select()
        .from(syncDataTable)
        .where(and(eq(syncDataTable.id, id), eq(syncDataTable.tableName, table), eq(syncDataTable.userId, userId)))
        .limit(1)

      const existingData = (existing[0]?.data as Record<string, unknown>) ?? {}
      const deletedData = {
        ...existingData,
        deleted_at: Math.floor(Date.now() / 1000),
      }

      if (existing.length > 0) {
        await db
          .update(syncDataTable)
          .set({ data: deletedData })
          .where(and(eq(syncDataTable.id, id), eq(syncDataTable.tableName, table), eq(syncDataTable.userId, userId)))
      }
      break
    }
  }
}
