# Sync Feature

Multi-device database synchronization using cr-sqlite CRDTs (Conflict-free Replicated Data Types).

## Overview

The sync feature enables real-time data synchronization across multiple devices for authenticated users. It uses:

- **cr-sqlite** ([@vlcn.io/crsqlite-wasm](https://github.com/vlcn-io/cr-sqlite)) for CRDT-based conflict resolution on the client
- **Two transport layers**: HTTP for initial sync, WebSocket for real-time updates
- **PostgreSQL** on the backend as a relay for changes between devices

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client (Browser)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────┐  │
│  │   React Component   │───▶│   useSyncService    │───▶│   SyncService   │  │
│  │                     │    │      (Hook)         │    │   (WebSocket)   │  │
│  └─────────────────────┘    └─────────────────────┘    └────────┬────────┘  │
│                                                                  │          │
│                              ┌───────────────────────────────────┘          │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          Core Sync Logic                             │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │    │
│  │  │ preparePush │  │ preparePull │  │ applyPull-  │  │ handlePush- │  │    │
│  │  │             │  │             │  │  Changes    │  │   Success   │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      CRSQLite Database                               │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │    │
│  │  │ crsql_      │  │  getChanges │  │ applyChanges│  │  getSiteId  │  │    │
│  │  │ changes     │  │  (since X)  │  │  (remote)   │  │             │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                              │
│                              │ Web Worker                                   │
└──────────────────────────────┼──────────────────────────────────────────────┘
                               │
                               │ HTTP / WebSocket
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Backend Server                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐                         │
│  │    HTTP Routes      │    │  WebSocket Handler  │                         │
│  │  POST /sync/push    │    │    /sync/ws         │                         │
│  │  GET  /sync/pull    │    │                     │                         │
│  │  GET  /sync/version │    │                     │                         │
│  └──────────┬──────────┘    └──────────┬──────────┘                         │
│             │                          │                                    │
│             └──────────┬───────────────┘                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Sync Core Logic                                 │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │    │
│  │  │ pushChanges │  │ pullChanges │  │ checkMigra- │                   │    │
│  │  │             │  │             │  │ tionVersion │                   │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                        │                                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      PostgreSQL Database                             │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐   │    │
│  │  │  sync_changes   │  │  sync_devices   │  │    user (with       │   │    │
│  │  │  (per-user      │  │  (device        │  │   syncMigration-    │   │    │
│  │  │   change log)   │  │   tracking)     │  │      Version)       │   │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Site ID

Each device has a unique site ID generated by cr-sqlite. This is stored in localStorage (`thunderbolt_site_id`) and used to:

- Identify changes made by this device
- Prevent re-pushing changes received from other devices
- Track devices on the backend

### Version Tracking

Two versions are tracked locally in localStorage:

1. **`thunderbolt_sync_version`** - Last local db_version that was successfully pushed
2. **`thunderbolt_server_version`** - Last server version received (for pull requests)

### Change Format

Changes are serialized for network transport with the following structure:

```typescript
type SerializedChange = {
  table: string // Table name
  pk: string // Primary key (base64 encoded)
  cid: string // Column ID
  val: unknown // Value
  col_version: string // Column version (bigint as string)
  db_version: string // Database version (bigint as string)
  site_id: string // Site ID (base64 encoded)
  cl: number // Causal length
  seq: number // Sequence number
}
```

### Migration Version Compatibility

To prevent sync conflicts between devices with different schema versions:

1. Each push includes the client's `migrationVersion`
2. The server stores the highest migration version seen per user (`syncMigrationVersion` on user table)
3. Clients with older migrations are rejected with a `version_mismatch` response
4. This ensures all devices sync against a compatible schema

## Transport Layers

### HTTP (Initial Sync)

Used during app initialization before the WebSocket connection is established:

- **`POST /v1/sync/push`** - Push local changes to server
- **`GET /v1/sync/pull`** - Pull remote changes since a given version
- **`GET /v1/sync/version`** - Get current server version

Located in:

- Client: `src/sync/initial-sync.ts`
- Backend: `backend/src/sync/routes.ts`

### WebSocket (Real-time Sync)

After app initialization, a persistent WebSocket connection provides real-time sync:

- **`ws://server/v1/sync/ws`** - WebSocket endpoint
- Messages: `auth`, `push`, `pull`
- Responses: `auth_success`, `auth_error`, `push_success`, `push_error`, `changes`, `version_mismatch`

Located in:

- Client: `src/sync/service.ts`
- Backend: `backend/src/sync/websocket.ts`

## Sync Flow

### 1. App Initialization

```
1. Database initialized (cr-sqlite)
2. Capture local changes BEFORE migrations (critical - see workaround below)
3. Run migrations
4. Initialize CRRs (crsql_as_crr)
5. Push preserved changes (captured in step 2)
6. Perform initial sync (HTTP push + pull)
7. Start WebSocket sync service
```

### 2. Push Flow (Client → Server)

```
1. preparePush()
   - Check if syncing is supported
   - Get local changes since last synced version (from crsql_changes)
   - Filter to only LOCAL changes (site_id = crsql_site_id())
   - Serialize changes for network transport

2. Send changes to server (HTTP or WebSocket)

3. handlePushSuccess()
   - Update thunderbolt_sync_version with pushed db_version
   - Update thunderbolt_server_version with server response
```

### 3. Pull Flow (Server → Client)

```
1. preparePull()
   - Get last known server version
   - Get site ID and migration version

2. Request changes from server since last server version

3. handlePullResponse()
   - Deserialize changes from network format
   - Apply changes to local database via crsql_changes
   - Update thunderbolt_server_version
```

### 4. Real-time Push

When the database changes locally:

```
1. rx-tbl (reactive table listener) detects change
2. Worker sends tablesChanged notification to main thread
3. SyncService.pushLocalChanges() called
4. Changes pushed via WebSocket
```

### 5. Real-time Pull (Broadcast)

When a push is received from another device:

```
1. Backend inserts changes to sync_changes table
2. Backend broadcasts to all OTHER connected clients of the same user
3. Client receives 'changes' message
4. Client applies changes to local database
5. React Query caches invalidated for affected tables
6. Chat sessions recreated if chat_messages changed
```

## Backend Database Schema

### sync_changes

Stores all change events per user:

```sql
CREATE TABLE sync_changes (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id),
  site_id TEXT NOT NULL,           -- Device that made the change
  table_name TEXT NOT NULL,
  pk TEXT NOT NULL,                -- Primary key (base64 encoded)
  cid TEXT NOT NULL,               -- Column ID
  val TEXT,                        -- Value (JSON stringified)
  col_version BIGINT NOT NULL,     -- Causal length
  db_version BIGINT NOT NULL,      -- Database version
  cl INTEGER NOT NULL,             -- Causal length
  seq INTEGER NOT NULL,            -- Sequence number
  site_id_raw TEXT NOT NULL,       -- Site ID (base64 encoded)
  created_at TIMESTAMP DEFAULT NOW()
);
```

### sync_devices

Tracks devices per user:

```sql
CREATE TABLE sync_devices (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id),
  site_id TEXT NOT NULL,           -- Device site ID
  migration_version TEXT,          -- Last migration hash
  last_seen_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### user.syncMigrationVersion

The `user` table includes a `sync_migration_version` column that stores the minimum required migration version for sync. This ensures all devices are compatible before syncing.

## Client-Side Components

### SyncService (WebSocket)

The main sync service class that manages:

- WebSocket connection lifecycle
- Automatic reconnection with exponential backoff (1s, 2s, 4s, ... up to 32s)
- Network status handling (online/offline)
- Database change listening
- Push/pull coordination

Status states:

- `idle` - Not connected
- `connecting` - Establishing connection
- `connected` - Connected and authenticated
- `syncing` - Actively pushing changes
- `error` - Error state
- `offline` - Device is offline
- `version_mismatch` - Client needs upgrade

### useSyncService Hook

React hook that provides:

```typescript
type UseSyncServiceResult = {
  status: SyncStatus
  isSupported: boolean // cr-sqlite database?
  isRunning: boolean // Service running?
  isEnabled: boolean // User preference
  toggleEnabled: () => void // Toggle sync
  forceSync: () => Promise<void>
  start: () => void
  stop: () => void
  lastError: Error | null
  requiredVersion: string | null // For version_mismatch
}
```

The hook also:

- Invalidates React Query caches when tables change
- Recreates chat sessions when chat_messages sync

### Table-to-Query-Key Mapping

When sync applies remote changes, React Query caches are invalidated:

```typescript
const TABLE_TO_QUERY_KEYS = {
  models: [['models']],
  tasks: [['tasks']],
  prompts: [['prompts'], ['triggers']],
  settings: [['settings']],
  chat_threads: [['chatThreads']],
  chat_messages: [['chatThreads']],
  mcp_servers: [['mcp-servers']],
  triggers: [['triggers']],
}
```

## CRSQLite Integration

### Web Worker

SQLite operations run in a Web Worker (`src/db/crsqlite-worker.ts`) to avoid blocking the main thread:

- `init` - Initialize database with cr-sqlite extension
- `exec` - Execute SQL statements
- `getSiteId` - Get unique device identifier
- `getChanges` - Get changes since version (only LOCAL changes)
- `applyChanges` - Apply remote changes via crsql_changes
- `subscribeToChanges` - Listen for database modifications
- `unsubscribeFromChanges` - Stop listening

### getChanges Implementation

Critical: Only returns LOCAL changes to prevent re-pushing synced changes:

```sql
SELECT * FROM crsql_changes
WHERE db_version > ? AND site_id = crsql_site_id()
ORDER BY db_version, seq
```

The `site_id = crsql_site_id()` filter ensures we only push our own changes, not changes received from other devices.

### applyChanges Implementation

Remote changes are applied by inserting into the crsql_changes virtual table:

```sql
INSERT INTO crsql_changes
  ("table", "pk", "cid", "val", "col_version", "db_version", "site_id", "cl", "seq")
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
```

cr-sqlite automatically merges these changes with local data using CRDT logic.

## CR-SQLite Migration Workaround

### The Problem

When cr-sqlite's `crsql_begin_alter`/`crsql_commit_alter` functions are called during schema migrations, they reset the internal `crsql_db_version()` and clear pending changes from the `crsql_changes` virtual table.

This means local changes can be lost if:

1. Device makes local changes
2. Device goes offline or falls behind on migrations
3. Another device pushes changes with a newer migration version
4. Original device can't push (migration version mismatch)
5. Original device runs migrations → db_version resets → **local changes LOST**

### The Workaround

During app initialization:

1. **Before migrations**: Capture pending changes to an in-memory array
2. **Run migrations**: With crsql_begin_alter/crsql_commit_alter (required for CRR metadata)
3. **After migrations**: Push captured changes to server

See `captureLocalChanges()` and `pushPreservedChanges()` in `src/hooks/use-app-initialization.ts`.

## Authentication

Sync requires authentication:

1. User must be logged in (session exists)
2. Auth token stored in settings database and cached in memory
3. HTTP requests include `Authorization: Bearer <token>` header
4. WebSocket auth message includes token
5. Backend validates session before processing sync requests

## Local Storage Keys

| Key                          | Purpose                            |
| ---------------------------- | ---------------------------------- |
| `thunderbolt_sync_version`   | Last pushed local db_version       |
| `thunderbolt_server_version` | Last received server version       |
| `thunderbolt_site_id`        | Unique device identifier           |
| `thunderbolt_sync_enabled`   | User preference (enabled/disabled) |

## File Structure

### Frontend

```
src/sync/
├── core.ts              # Core sync logic (push/pull preparation & handling)
├── index.ts             # Module exports
├── initial-sync.ts      # HTTP-based initial sync
├── service.ts           # WebSocket sync service
├── service.test.ts      # Tests
├── use-sync-service.tsx # React hook
└── utils.ts             # Serialization, version tracking, localStorage

src/db/
├── crsqlite-database.ts     # CRSQLite database class
├── crsqlite-worker.ts       # Web Worker for SQLite operations
├── crsqlite-worker-client.ts # Worker client wrapper
└── singleton.ts             # Database singleton with sync support check
```

### Backend

```
backend/src/sync/
├── routes.ts        # HTTP endpoints (push, pull, version)
├── websocket.ts     # WebSocket handler
├── sync-core.ts     # Shared sync logic
├── schema.ts        # Database schema (sync_changes, sync_devices)
└── utils.ts         # Shared utilities (migration version comparison)
```

## Enabling Sync

1. User must be authenticated (logged in)
2. Sync must be enabled in user preferences (`thunderbolt_sync_enabled = 'true'`)
3. Database must be cr-sqlite type (`DatabaseSingleton.instance.supportsSyncing`)
4. Cloud URL must be configured

## Error Handling

- Network errors: Automatic reconnection with exponential backoff
- Auth errors: Service stops, user must re-authenticate
- Version mismatch: Service stops, user must upgrade app
- Initial sync failures: Non-critical, app continues with local data
