# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SoundCloud-like music streaming backend built with NestJS 11, TypeScript 5, PostgreSQL (TypeORM), Redis, BullMQ, Socket.io, Meilisearch, and Stripe.

## Commands

### Development
```bash
npm run dev              # Watch mode (ts-node with automatic reload)
npm run build            # Compile to dist/
npm run start            # Run compiled production build
npm run type-check       # TypeScript validation without emitting
```

### Docker
```bash
npm run docker:dev       # Start dev stack (Postgres + Redis + app)
npm run docker:dev:build # Rebuild and start dev stack
```

### Database
```bash
npm run migration:generate -- --name=<MigrationName>  # Auto-generate from entity changes
npm run migration:run    # Execute pending migrations
npm run migration:revert # Rollback last migration
npm run migration:show   # Show migration status
npm run seed:fresh       # Drop schema + migrate + clear Meilisearch + seed
npm run seed             # Seed without dropping (preserves data)
npm run schema:drop      # Drop entire database schema
```

### Testing
```bash
npm test                                     # Run all tests
npm run test:watch                           # Watch mode
npm run test:cov                             # Coverage report (80% threshold)
npm run test:module -- --testPathPattern=track  # Run tests matching pattern
npm run test:file -- src/track/track.service.spec.ts  # Run single file
```

### Code Quality
```bash
npm run lint             # Check ESLint violations
npm run lint:fix         # Auto-fix ESLint violations
npm run format           # Prettier format all files
```

### Meilisearch
```bash
npm run meili:reindex    # Rebuild all search indexes from database
npm run meili:clear      # Clear all search indexes
```

### Performance Testing (k6)
```bash
npm run stress:infra:up  # Start stress test infrastructure
npm run k6:login         # Load test the login endpoint
npm run k6:auth          # Load test authenticated endpoints
```

## Architecture

### Request Lifecycle
Every request flows through: **Guard chain → Controller → Service → Repository**

Global guards applied in order (configured in `app.module.ts` providers): `JwtAuthGuard` → `RolesGuard` → `PlansGuard`. Routes are authenticated by default; use `@Public()` to opt out.

### Three-Layer Module Pattern
Every feature module follows the same structure:
- **Controller**: HTTP handling, file uploads, Swagger decorators, SSE streaming
- **Service**: Business logic, orchestrates across repositories and other services, manages queues
- **Repository**: TypeORM query builder, Meilisearch sync for track-related ops

Repositories are **not** NestJS injectable by default — they use `TypeOrmModule.forFeature([Entity])` and are wrapped in custom repository classes that extend the TypeORM `Repository<T>`.

### Authentication & Authorization
- Access tokens live in `httpOnly` cookies (`access_token`, 15 min expiry)
- Refresh tokens are in `httpOnly` cookies (`refresh_token`, 7 days)
- OAuth flows (Google/Facebook) use `express-session` backed by Redis for the transient state between redirect and callback
- `@CurrentUser()` injects the full `JwtPayload` — **not** a database User entity. Fetch the entity explicitly in the service if you need DB fields.
- Plan-based access (`@Plans('pro', 'go+')`) is checked independently of role-based access (`@Roles('artist', 'admin')`)

### Async Background Work
BullMQ is used for three distinct queues, all defined as injection tokens in their respective modules:
- **audioQueue** (`AUDIO_QUEUE`): FFmpeg conversion and preview generation after track upload
- **fansQueue** (`FANS_QUEUE`): Notify followers when an artist publishes a track
- **releaseQueue** (`RELEASE_QUEUE`): Scheduled track releases at a future timestamp

Queue processors live in `*/listeners/` subdirectories of the feature module.

### Real-time (WebSockets)
Socket.io with Redis adapter for horizontal scaling. The shared `WebsocketsGateway` (`src/websockets/`) handles connection management and namespace routing. The `MessagingGateway` (`src/messaging/`) handles chat events. Both gates run under the same Socket.io server instance configured in `main.ts`.

### Environment Configuration
Config is loaded via `@nestjs/config` with validated typed factories in `src/config/`. Three env files exist: `.env.dev`, `.env.stress`, `.env.prod` (production not tracked). The `NODE_ENV` variable controls which file is loaded via docker-compose or direct `dotenv` loading. Use `.env.dev` as the template for local setup.

### Database Conventions
- All entities extend `BaseEntity` from `src/common/entities/base.entity.ts` which adds `createdAt`/`updatedAt` automatically.
- `synchronize: false` — **always create a migration** for schema changes, never rely on auto-sync.
- Migration file names must be timestamped: `npm run migration:generate -- --name=<Name>` handles this.

### Search (Meilisearch)
Meilisearch is optional — the server starts with a warning if unavailable. Track create/update/delete in `TrackRepository` automatically sync to Meilisearch. The `src/search/` directory contains standalone scripts for bulk operations (indexing, reindexing, clearing) run via npm scripts directly against the DB.

### Subscription Plans & Audio Quality
Three tiers: `free`, `pro`, `go+`. Audio URL resolution logic in `src/common/utilities/audio.util.ts` returns different quality versions based on the authenticated user's plan extracted from the JWT payload.

### File Storage
All files (audio, cover art, avatars) go through `StorageService` (`src/common/storage_service.ts`), which wraps AWS S3. FFmpeg processing happens **before** S3 upload via `FfmpegService` in `src/audio/`.

## Testing Conventions
- Tests use `@nestjs/testing` `TestingModule` with all dependencies mocked as `jest.fn()` providers.
- Coverage excludes repositories, entities, DTOs, modules, decorators, guards, strategies, and seed files — only services and controllers need to hit the 80% threshold.
- Max 2 Jest workers to avoid resource contention (`--maxWorkers=2` in jest config).
- The `tsconfig.test.json` sets `isolatedModules: true` — avoid constructs that require type information at test compile time.

## Key Env Variables (must be set)
| Variable | Purpose |
|---|---|
| `DATABASE_URL` / `DB_*` | PostgreSQL connection |
| `REDIS_URL` | Redis for sessions, caching, queues, Socket.io |
| `JWT_SECRET` | Access token signing |
| `SESSION_SECRET` | Express session signing |
| `AWS_BUCKET` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | S3 file storage |
| `MEILI_HOST` / `MEILI_MASTER_KEY` | Meilisearch |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Payments |
| `FIREBASE_*` | Push notifications |
| `GOOGLE_CLIENT_ID` / `FACEBOOK_APP_ID` | OAuth |
