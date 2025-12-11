import { jsonb, pgTable, text, varchar, integer, primaryKey } from 'drizzle-orm/pg-core'

// Re-export Better Auth schema tables
export * from './auth-schema'

export const usersTable = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
})

/**
 * Generic sync data table for PowerSync.
 *
 * This table stores all synced data from client devices in a flexible format.
 * Each row represents a record from a client-side table (models, settings, etc.)
 *
 * Benefits:
 * - Single source of truth for schema (frontend only)
 * - No schema drift between FE/BE
 * - Simpler migrations - just add fields in FE
 *
 * The composite primary key (id, tableName, userId) provides:
 * - Data isolation per user (can't accidentally overwrite another user's data)
 * - DB-level enforcement of multi-tenancy
 */
export const syncDataTable = pgTable(
  'sync_data',
  {
    id: text('id').notNull(),
    userId: text('user_id').notNull(),
    tableName: text('table_name').notNull(), // e.g., 'models', 'settings', 'prompts'
    data: jsonb('data').notNull(), // The actual row data as JSON
  },
  (table) => [primaryKey({ columns: [table.id, table.tableName, table.userId] })],
)
