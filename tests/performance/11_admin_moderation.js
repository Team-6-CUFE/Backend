/**
 * tests/performance/11_admin_moderation.js
 * ------------------------------------------
 * k6 stress test – Moderation & Admin Dashboard (Module 11)
 * Routes:
 *   GET /api/admin/stats
 *   GET /api/admin/users
 *   GET /api/admin/tracks
 *   GET /api/admin/engagement
 *   GET /api/report/all
 *
 * Uses stress_admin@test.local (role=admin).
 * Lower VU count — admin traffic is naturally sparse.
 *
 * Thresholds: <2% errors, p95 < 2000 ms
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const adminErrors   = new Rate('admin_errors');
const adminDuration = new Trend('admin_duration', true);

export const options = {
  stages: [
    { duration: '30s', target: 2  },
    { duration: '1m',  target: 10 },
    { duration: '2m',  target: 10 },
    { duration: '30s', target: 0  },
  ],
  thresholds: {
    admin_errors:    ['rate<0.02'],
    admin_duration:  ['p(95)<2000'],
    http_req_failed: ['rate<0.02'],
  },
};

const BASE_URL        = __ENV.BASE_URL        || 'http://localhost:4001';
const STRESS_EMAIL    = __ENV.STRESS_EMAIL    || 'stress_admin@test.local';
const STRESS_PASSWORD = __ENV.STRESS_PASSWORD || 'StressAdmin123!';

function jsonHeaders(cookie) {
  return { headers: { 'Content-Type': 'application/json', Cookie: cookie } };
}

function loginAndGetCookie() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: STRESS_EMAIL, password: STRESS_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (res.status !== 200) {
    console.error(`admin login failed: ${res.status} ${res.body}`);
    return null;
  }
  const setCookie = res.headers['Set-Cookie'] || '';
  const match = setCookie.match(/access_token=([^;]+)/);
  return match ? `access_token=${match[1]}` : null;
}

// ── Setup ─────────────────────────────────────────────────────
export function setup() {
  const cookie = loginAndGetCookie();
  if (!cookie) console.error('setup: admin login failed — all admin tests will fail');
  return { cookie: cookie || '' };
}

// ── Main test ─────────────────────────────────────────────────
export default function (data) {
  const { cookie } = data;
  if (!cookie) { sleep(1); return; }

  const roll = Math.random();

  if (roll < 0.30) {
    group('GET admin/stats', () => {
      const res = http.get(`${BASE_URL}/api/admin/stats`, jsonHeaders(cookie));
      adminDuration.add(res.timings.duration);
      const ok = check(res, { 'status 200': (r) => r.status === 200 });
      adminErrors.add(!ok);
    });
  } else if (roll < 0.55) {
    group('GET admin/users', () => {
      const res = http.get(
        `${BASE_URL}/api/admin/users?limit=20&offset=0`,
        jsonHeaders(cookie)
      );
      adminDuration.add(res.timings.duration);
      const ok = check(res, { 'status 200': (r) => r.status === 200 });
      adminErrors.add(!ok);
    });
  } else if (roll < 0.75) {
    group('GET admin/tracks', () => {
      const res = http.get(
        `${BASE_URL}/api/admin/tracks?limit=20&page=1`,
        jsonHeaders(cookie)
      );
      adminDuration.add(res.timings.duration);
      const ok = check(res, { 'status 200': (r) => r.status === 200 });
      adminErrors.add(!ok);
    });
  } else if (roll < 0.88) {
    group('GET admin/engagement', () => {
      const res = http.get(`${BASE_URL}/api/admin/engagement`, jsonHeaders(cookie));
      adminDuration.add(res.timings.duration);
      const ok = check(res, { 'status 200': (r) => r.status === 200 });
      adminErrors.add(!ok);
    });
  } else {
    group('GET report/all', () => {
      const res = http.get(
        `${BASE_URL}/api/report/all?limit=20&page=1`,
        jsonHeaders(cookie)
      );
      adminDuration.add(res.timings.duration);
      const ok = check(res, { 'status 200': (r) => r.status === 200 });
      adminErrors.add(!ok);
    });
  }

  sleep(Math.random() * 2 + 1); // 1–3 s (admins browse dashboards slowly)
}
