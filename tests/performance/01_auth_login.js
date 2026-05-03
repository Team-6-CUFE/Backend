/**
 * tests/performance/01_auth_login.js
 * ------------------------------------------
 * k6 stress test – Login / Auth flow
 * Target: POST /api/auth/login
 *
 * Strategy:
 *   - Gradual ramp-up to avoid cold-start spikes
 *   - Uses a pre-seeded stress-test user account
 *   - Checks HTTP 200 + response body validity
 *   - Thresholds: <1% errors, p95 < 1000 ms
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Custom metrics ──────────────────────────────────────────
const loginErrors = new Rate('login_errors');
const loginDuration = new Trend('login_duration', true);

// ── Options ──────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // warm up: ramp to 5 VUs
    { duration: '1m',  target: 20 },  // ramp to 20 VUs
    { duration: '2m',  target: 20 },  // hold at 20 VUs
    { duration: '30s', target: 0 },   // ramp down
  ],
  thresholds: {
    // No more than 1% of requests should fail
    login_errors: ['rate<0.01'],
    // 95th percentile response time must be under 1 second
    login_duration: ['p(95)<1000'],
    // Overall HTTP request failure rate
    http_req_failed: ['rate<0.01'],
  },
};

// ── Config ────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4001';

// pre-seeded user
const TEST_EMAIL    = __ENV.STRESS_EMAIL    || 'stress_user@test.local';
const TEST_PASSWORD = __ENV.STRESS_PASSWORD || 'StressPass123!';

// ── Main test function ────────────────────────────────────────
export default function () {
  const url = `${BASE_URL}/api/auth/login`;

  const payload = JSON.stringify({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  // Track custom metrics
  loginDuration.add(res.timings.duration);

  const success = check(res, {
    'status is 200':            (r) => r.status === 200,
    'response has access_token or cookie': (r) =>
      r.status === 200 &&
      (r.headers['Set-Cookie'] !== undefined || r.body.includes('access_token') || r.body.includes('user')),
  });

  // Record as error if checks fail
  loginErrors.add(!success);

  // Simulate realistic think time between requests
  sleep(Math.random() * 1 + 0.5); // 0.5–1.5 s
}
