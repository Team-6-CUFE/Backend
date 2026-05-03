# Harmonica Backend – Performance / Stress Tests (`tests/performance`)

## Test suite

| File | Module | Routes Tested | Auth | Max VUs |
|------|--------|--------------|------|---------|
| `01_auth_login.js` | Mod 1 – Auth | `POST /api/auth/login` | No | 20 |
| `02_public_profile_get.js` | – | `GET /api/profile/:username` · `check-username` | No | 50 |
| `03_authenticated_profile_me.js` | – | `GET /api/profile/me` · `GET /api/auth/emails` | Yes | 30 |
| `04_track_management.js` | **Mod 4** | GET/like/unlike/comment tracks | Yes | 25 |
| `05_streaming_playback.js` | **Mod 5** | `GET .../stream` · `POST .../play` · related-tracks | Yes | 40 |
| `08_feed_search_discovery.js` | **Mod 8** | feed/discover · feed/following · search · autocomplete · trending | Yes | 30 |
| `10_notifications.js` | **Mod 10** | GET/PATCH notifications (HTTP) + Socket.io WS | Yes | 20+10 WS |
| `11_admin_moderation.js` | **Mod 11** | admin/stats · admin/users · admin/tracks · report/all | Admin | 10 |

All tests use gradual ramp-up and define thresholds for error rate and p95 latency.

---

## Prerequisites

### 1 — k6 installed
```powershell
winget install k6 --source winget
```

### 2 — Full stress environment setup (one-time)
```powershell
# From repo root — starts Docker infra, runs migrations, creates all users, seeds data
npm run stress:setup:full
```

This runs in order:
1. `stress:infra:up` — Postgres + Redis containers
2. `wait_for_postgres.js` — waits for DB ready
3. `stress:db:setup` — creates `SoundCloud_stress` database
4. `stress:migrate` — runs TypeORM migrations
5. `stress:user:create` — creates `stress_user@test.local` (role: listener)
6. `stress:admin:create` — creates `stress_admin@test.local` (role: admin)
7. `stress:seed` — seeds 20 tracks + 30 notifications

### 3 — Start the stress server (separate terminal)
```powershell
npm run start:stress   # NestJS on port 4001 using .env.stress
```

---

## Running individual tests

```powershell
npm run k6:login        # Mod 1  – auth login
npm run k6:track        # Mod 4  – track management
npm run k6:streaming    # Mod 5  – streaming & playback
npm run k6:discovery    # Mod 8  – feed, search & discovery
npm run k6:notifications # Mod 10 – HTTP notifications + WebSocket
npm run k6:admin        # Mod 11 – admin & moderation
```

### Run all tests sequentially
```powershell
npm run k6:all
```

### Save results to JSON
```powershell
k6 run --out json=results/04_track_results.json `
  --env BASE_URL=http://localhost:4001 `
  --env STRESS_EMAIL=stress_user@test.local `
  --env STRESS_PASSWORD=StressPass123! `
  tests/performance/04_track_management.js
```

---

## Thresholds

| Test | Error threshold | p95 target | Notes |
|------|----------------|------------|-------|
| Login | `rate < 1%` | `< 1000 ms` | |
| Public profile | `rate < 1%` | `< 800 ms` | |
| Auth profile | `rate < 2%` | `< 800 ms` | |
| **Track management** | `rate < 2%` | `< 1000 ms` | 409 on double-like = expected |
| **Streaming** | `rate < 2%` | `< 800 ms` | Tests redirect, not byte stream |
| **Discovery** | `rate < 3%` | `< 2000 ms` | Meilisearch adds latency |
| **Notifications** | `rate < 2%` | `< 800 ms` | WS errors < 1% |
| **Admin** | `rate < 2%` | `< 2000 ms` | Complex aggregation queries |

---

## What to record in your test report

- p50 / p90 / p95 / p99 per endpoint group
- Requests/sec (RPS) at peak VU count
- Error rate (HTTP failures) — k6 exits with code 99 on threshold violation
- WebSocket connection success rate (mod 10)
- Server CPU / memory during each test run (optional)
