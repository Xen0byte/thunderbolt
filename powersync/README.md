# PowerSync Local Development

Docker setup for running PowerSync locally, connecting to your PGLite database.

## Prerequisites

- Docker and Docker Compose installed
- PGLite running: `cd backend && bun run db:dev` (port 5432)
- Backend running: `cd backend && bun run dev` (port 8000)

## Quick Start

```bash
# 1. Start PGLite database (in backend folder)
cd backend && bun run db:dev

# 2. Start PowerSync (in another terminal)
cd powersync && docker-compose up

# 3. Start backend (in another terminal)
cd backend && bun run dev
```

## Services

| Service   | Port  | Description                        |
| --------- | ----- | ---------------------------------- |
| PowerSync | 8080  | Sync service                       |
| MongoDB   | 27017 | PowerSync internal storage         |
| PGLite    | 5432  | Your local database (runs on host) |

## Useful Commands

```bash
# View logs
docker-compose logs -f powersync

# Stop services
docker-compose down

# Reset (remove all data)
docker-compose down -v
```

## Database Setup

Make sure the `sync_data` table exists in your PGLite database. Run the backend migration:

```bash
cd backend && bun run db push
```

## JWT Secret

The JWT secret in `config/config.yaml` must match `POWERSYNC_JWT_SECRET` in backend `.env`.
Default: `powersync-dev-secret-change-in-production`
