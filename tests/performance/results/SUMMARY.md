# Stress Test Results – Harmonica Backend
**Run date:** 2026-05-03  
**Environment:** `SoundCloud_stress` DB · Redis · NestJS on port 4001 (`.env.stress`)  
**Tool:** k6

---

## Results at a Glance

| # | Module | Max VUs | Iterations | Peak RPS | Avg (ms) | p50 (ms) | p90 (ms) | p95 (ms) | p99 (ms) | Error Rate | Result |
|---|--------|---------|-----------|---------|---------|---------|---------|---------|---------|-----------|--------|
| 01 | Auth – Login | 20 | 2,847 | 15.4 | 312 | 290 | 521 | 688 | 912 | 0.00% | ✓ PASS |
| 02 | Public Profile GET | 50 | 8,412 | 93.4 | 95 * | 81 | 178 | 229 | 374 | 0.00% | ✓ PASS |
| 03 | Auth Profile /me | 30 | 4,183 | 51.4 | 145 * | 128 | 298 | 412 | 678 | 0.00% | ✓ PASS |
| 04 | Track Management | 25 | 3,891 | 24.2 | 215 | 182 | 412 | 576 | 891 | 0.00% † | ✓ PASS |
| 05 | Streaming & Playback | 40 | 7,836 | 52.8 | 131 | 108 | 298 | 421 | 673 | 0.18% | ✓ PASS |
| 08 | Feed, Search & Discovery | 30 | 4,921 | 30.1 | 283 | 198 | 842 | 1341 | 1819 | 1.12% | ✓ PASS |
| 10 | Notifications (HTTP) | 20 | 3,612 | 21.7 | 78 | 62 | 182 | 287 | 421 | 0.00% | ✓ PASS |
| 10 | Notifications (WS) | 10 | 60 conn | — | — | — | — | — | — | 0.00% | ✓ PASS |
| 11 | Admin & Moderation | 10 | 722 | 4.1 | 482 | 441 | 1128 | 1621 | 1893 | 0.00% | ✓ PASS |

\* `profile_duration` / `auth_profile_duration` custom metric (GET only, excludes login)  
† `track_errors = 0.00%`; `http_req_failed = 1.65%` from expected 409/404 on concurrent like/unlike

**All 8 test suites PASSED all thresholds.**

---

## Per-Module Detail

### 01 – Auth Login (`POST /api/auth/login`)
- bcrypt dominates latency (~250 ms avg hashing time)
- Stable under 20 VUs; no failures
- p95 = 688 ms — comfortably under 1000 ms threshold

### 02 – Public Profile (`GET /api/profile/:username`)
- Highest VU count (50); no auth overhead
- 14 checks failed on "response time < 1 s" (outliers at tail); error *rate* = 0.00%
- p95 = 229 ms — well under 800 ms threshold

### 03 – Authenticated Profile `/me`
- Each VU performs login → GET /me → GET emails per iteration
- Cookie jar correctly propagates `access_token` across requests
- p95 (auth_profile_duration) = 412 ms — under 800 ms threshold

### 04 – Track Management (like / unlike / comment / fetch)
- 409 Conflict and 404 Not Found on concurrent like/unlike are expected and handled by checks
- `track_errors = 0.00%`; `http_req_failed = 1.65%` (below 2% threshold)
- p95 = 576 ms — under 1000 ms threshold

### 05 – Streaming & Playback
- Tests app-server redirect generation, not S3 byte delivery
- 14 failures (0.18%) on `GET related-tracks` — Meilisearch query under peak
- p95 = 421 ms — under 800 ms threshold

### 08 – Feed, Search & Discovery
- Highest p95 (1341 ms) due to Meilisearch full-text search latency
- 44 HTTP 503s during a 15-second Meilisearch hiccup at t≈2m12s
- 1.12% discovery_errors, 0.89% http_req_failed — both under 3% threshold
- p95 = 1341 ms — under 2000 ms threshold

### 10 – Notifications (HTTP + WebSocket)
- HTTP scenario: clean p95 = 287 ms across GET list / unread-count / PATCH read-all
- WebSocket scenario: 60/60 connections succeeded (100%), 183 messages received
- Both scenarios PASS all thresholds

### 11 – Admin & Moderation
- Aggregation queries (stats, engagement) reach p95 ≈ 1.6 s under 10 VUs
- Still within 2000 ms threshold; admin traffic is inherently low-volume
- 0% errors across all 722 iterations

---

## WebSocket Connection Summary (Module 10)

| Metric | Value |
|--------|-------|
| VUs (constant) | 10 |
| Total connections | 60 |
| Successful upgrades (101) | 60 (100%) |
| Messages received | 183 |
| `ws_errors` rate | 0.00% |
| Threshold (`< 1%`) | ✓ PASS |

---

## Threshold Summary

| Metric | Threshold | Measured | Status |
|--------|-----------|---------|--------|
| `login_errors` | < 1% | 0.00% | ✓ |
| `login_duration` p95 | < 1000 ms | 688 ms | ✓ |
| `profile_errors` | < 1% | 0.00% | ✓ |
| `profile_duration` p95 | < 800 ms | 229 ms | ✓ |
| `auth_profile_errors` | < 2% | 0.00% | ✓ |
| `auth_profile_duration` p95 | < 800 ms | 412 ms | ✓ |
| `track_errors` | < 2% | 0.00% | ✓ |
| `track_duration` p95 | < 1000 ms | 576 ms | ✓ |
| `stream_errors` | < 2% | 0.18% | ✓ |
| `stream_duration` p95 | < 800 ms | 421 ms | ✓ |
| `discovery_errors` | < 3% | 1.12% | ✓ |
| `discovery_duration` p95 | < 2000 ms | 1341 ms | ✓ |
| `notif_errors` | < 2% | 0.00% | ✓ |
| `notif_duration` p95 | < 800 ms | 287 ms | ✓ |
| `ws_errors` | < 1% | 0.00% | ✓ |
| `admin_errors` | < 2% | 0.00% | ✓ |
| `admin_duration` p95 | < 2000 ms | 1621 ms | ✓ |
