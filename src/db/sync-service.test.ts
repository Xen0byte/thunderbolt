/**
 * Tests for sync service chat session change extraction
 *
 * Note: This test file uses mock.module() which can interfere with other tests
 * when run together. Run this file separately: `bun test src/db/sync-service.test.ts`
 */

import { describe, expect, it, mock, beforeEach } from 'bun:test'
import type { KyInstance } from 'ky'
import { SyncService, type SerializedChange } from './sync-service'

// Mock the DatabaseSingleton
const mockSyncableDatabase = {
  getSiteId: mock(() => Promise.resolve('test-site-id')),
  getChanges: mock(() => Promise.resolve({ changes: [], dbVersion: 0n })),
  applyChanges: mock(() => Promise.resolve({ dbVersion: 1n })),
}

// Mock module before importing
mock.module('./singleton', () => ({
  DatabaseSingleton: {
    instance: {
      isInitialized: true,
      supportsSyncing: true,
      syncableDatabase: mockSyncableDatabase,
    },
  },
}))

mock.module('./migrate', () => ({
  getLatestMigrationVersion: () => '0001',
}))

/**
 * Creates a valid SerializedChange for testing
 */
const createSerializedChange = (overrides: Partial<SerializedChange>): SerializedChange => ({
  table: 'test_table',
  pk: btoa('test-pk'), // base64 encoded
  cid: 'test_column',
  val: 'test-value',
  col_version: '1',
  db_version: '1',
  site_id: btoa('site-1'), // base64 encoded
  cl: 1,
  seq: 1,
  ...overrides,
})

describe('SyncService', () => {
  describe('onChatSessionsChanged callback', () => {
    const createMockHttpClient = (pullResponse: { changes: SerializedChange[]; serverVersion: string }) =>
      ({
        post: mock(() => ({
          json: () => Promise.resolve({ success: true, serverVersion: '1' }),
        })),
        get: mock(() => ({
          json: () => Promise.resolve(pullResponse),
        })),
      }) as unknown as KyInstance

    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear()
    })

    it('should call onChatSessionsChanged with affected chat thread IDs', async () => {
      const onChatSessionsChanged = mock((_ids: string[]) => {})

      const pullResponse = {
        changes: [
          createSerializedChange({ table: 'chat_messages', cid: 'chat_thread_id', val: 'thread-1' }),
          createSerializedChange({ table: 'chat_messages', cid: 'chat_thread_id', val: 'thread-2' }),
          createSerializedChange({ table: 'chat_messages', cid: 'content', val: 'hello' }),
          createSerializedChange({ table: 'other_table', cid: 'some_col', val: 'value' }),
        ],
        serverVersion: '2',
      }

      const service = new SyncService({
        httpClient: createMockHttpClient(pullResponse),
        onChatSessionsChanged,
      })

      await service.pullChanges()

      expect(onChatSessionsChanged).toHaveBeenCalledTimes(1)
      expect(onChatSessionsChanged).toHaveBeenCalledWith(['thread-1', 'thread-2'])
    })

    it('should deduplicate chat thread IDs', async () => {
      const onChatSessionsChanged = mock((_ids: string[]) => {})

      const pullResponse = {
        changes: [
          createSerializedChange({ table: 'chat_messages', cid: 'chat_thread_id', val: 'thread-1', pk: btoa('pk1') }),
          createSerializedChange({ table: 'chat_messages', cid: 'chat_thread_id', val: 'thread-1', pk: btoa('pk2') }),
          createSerializedChange({ table: 'chat_messages', cid: 'chat_thread_id', val: 'thread-1', pk: btoa('pk3') }),
        ],
        serverVersion: '2',
      }

      const service = new SyncService({
        httpClient: createMockHttpClient(pullResponse),
        onChatSessionsChanged,
      })

      await service.pullChanges()

      expect(onChatSessionsChanged).toHaveBeenCalledTimes(1)
      expect(onChatSessionsChanged).toHaveBeenCalledWith(['thread-1'])
    })

    it('should not call onChatSessionsChanged when no chat_messages changes', async () => {
      const onChatSessionsChanged = mock((_ids: string[]) => {})

      const pullResponse = {
        changes: [createSerializedChange({ table: 'other_table', cid: 'column', val: 'value' })],
        serverVersion: '2',
      }

      const service = new SyncService({
        httpClient: createMockHttpClient(pullResponse),
        onChatSessionsChanged,
      })

      await service.pullChanges()

      expect(onChatSessionsChanged).not.toHaveBeenCalled()
    })

    it('should not call onChatSessionsChanged when no changes received', async () => {
      const onChatSessionsChanged = mock((_ids: string[]) => {})

      const pullResponse = {
        changes: [],
        serverVersion: '2',
      }

      const service = new SyncService({
        httpClient: createMockHttpClient(pullResponse),
        onChatSessionsChanged,
      })

      await service.pullChanges()

      expect(onChatSessionsChanged).not.toHaveBeenCalled()
    })

    it('should only extract string values from chat_thread_id column', async () => {
      const onChatSessionsChanged = mock((_ids: string[]) => {})

      const pullResponse = {
        changes: [
          createSerializedChange({ table: 'chat_messages', cid: 'chat_thread_id', val: 'thread-1' }),
          createSerializedChange({ table: 'chat_messages', cid: 'chat_thread_id', val: null }),
          createSerializedChange({ table: 'chat_messages', cid: 'chat_thread_id', val: 123 }),
          createSerializedChange({ table: 'chat_messages', cid: 'chat_thread_id', val: 'thread-2' }),
        ],
        serverVersion: '2',
      }

      const service = new SyncService({
        httpClient: createMockHttpClient(pullResponse),
        onChatSessionsChanged,
      })

      await service.pullChanges()

      expect(onChatSessionsChanged).toHaveBeenCalledTimes(1)
      // Should only include string values
      expect(onChatSessionsChanged).toHaveBeenCalledWith(['thread-1', 'thread-2'])
    })
  })
})
