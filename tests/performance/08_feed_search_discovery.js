/**
 * tests/performance/08_feed_search_discovery.js
 * -----------------------------------------------
 * k6 stress test – Feed, Search & Discovery (Module 8)
 * Routes:
 *   GET /api/discovery/feed/discover          (personalised feed)
 *   GET /api/discovery/feed/following         (following feed)
 *   GET /api/discovery/search?query=          (Meilisearch-backed)
 *   GET /api/discovery/autocomplete?query=    (search autocomplete)
 *   GET /api/discovery/trending/genres/random (public, no auth)
 *
 * Thresholds: <3% errors, p95 < 2000 ms
 * (Search routes hit Meilisearch so allow more headroom)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const discoveryErrors   = new Rate('discovery_errors');
const discoveryDuration = new Trend('discovery_duration', true);

export const options = {
  stages: [
    { duration: '30s', target: 5  },
    { duration: '1m',  target: 30 },
    { duration: '2m',  target: 30 },
    { duration: '30s', target: 0  },
  ],
  thresholds: {
    discovery_errors:   ['rate<0.03'],
    discovery_duration: ['p(95)<2000'],
    http_req_failed:    ['rate<0.03'],
  },
};

const BASE_URL        = __ENV.BASE_URL        || 'http://localhost:4001';
const STRESS_EMAIL    = __ENV.STRESS_EMAIL    || 'stress_user@test.local';
const STRESS_PASSWORD = __ENV.STRESS_PASSWORD || 'StressPass123!';

const SEARCH_TERMS     = ['midnight', 'city', 'ocean', 'summer', 'neon', 'rain', 'fire'];
const AUTOCOMPLETE_PFX = ['m', 'ci', 'oc', 'su', 'ne', 'r', 'fi'];

function jsonHeaders(cookie) {
  return { headers: { 'Content-Type': 'application/json', Cookie: cookie } };
}

function loginAndGetCookie() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: STRESS_EMAIL, password: STRESS_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (res.status !== 200) return null;
  const setCookie = res.headers['Set-Cookie'] || '';
  const match = setCookie.match(/access_token=([^;]+)/);
  return match ? `access_token=${match[1]}` : null;
}

// ── Setup ─────────────────────────────────────────────────────
export function setup() {
  const cookie = loginAndGetCookie();
  if (!cookie) console.error('setup: login failed — discovery tests will run unauthenticated');
  return { cookie: cookie || '' };
}

// ── Main test ─────────────────────────────────────────────────
export default function (data) {
  const { cookie } = data;
  const roll = Math.random();
  const idx  = Math.floor(Math.random() * SEARCH_TERMS.length);

  if (roll < 0.25) {
    // ── Discover feed ─────────────────────────────────────────
    group('GET feed/discover', () => {
      const res = http.get(
        `${BASE_URL}/api/discovery/feed/discover?limit=20`,
        jsonHeaders(cookie)
      );
      discoveryDuration.add(res.timings.duration);
      const ok = check(res, { 'status 200': (r) => r.status === 200 });
      discoveryErrors.add(!ok);
    });
  } else if (roll < 0.50) {
    // ── Following feed ────────────────────────────────────────
    group('GET feed/following', () => {
      const res = http.get(
        `${BASE_URL}/api/discovery/feed/following?limit=20`,
        jsonHeaders(cookie)
      );
      discoveryDuration.add(res.timings.duration);
      const ok = check(res, { 'status 200': (r) => r.status === 200 });
      discoveryErrors.add(!ok);
    });
  } else if (roll < 0.70) {
    // ── Full-text search ──────────────────────────────────────
    group('GET search', () => {
      const query = encodeURIComponent(SEARCH_TERMS[idx]);
      const res = http.get(
        `${BASE_URL}/api/discovery/search?query=${query}&limit=10`,
        jsonHeaders(cookie)
      );
      discoveryDuration.add(res.timings.duration);
      // 200 with results OR 200 with empty array both acceptable
      const ok = check(res, { 'status 200': (r) => r.status === 200 });
      discoveryErrors.add(!ok);
    });
  } else if (roll < 0.90) {
    // ── Autocomplete ──────────────────────────────────────────
    group('GET autocomplete', () => {
      const prefix = encodeURIComponent(AUTOCOMPLETE_PFX[idx]);
      const res = http.get(
        `${BASE_URL}/api/discovery/autocomplete?query=${prefix}`,
        { headers: { Cookie: cookie } }
      );
      discoveryDuration.add(res.timings.duration);
      const ok = check(res, { 'status 200': (r) => r.status === 200 });
      discoveryErrors.add(!ok);
    });
  } else {
    // ── Trending genres (public) ──────────────────────────────
    group('GET trending/genres/random', () => {
      const res = http.get(`${BASE_URL}/api/discovery/trending/genres/random`);
      discoveryDuration.add(res.timings.duration);
      const ok = check(res, { 'status 200': (r) => r.status === 200 });
      discoveryErrors.add(!ok);
    });
  }

  sleep(Math.random() * 1 + 0.5); // 0.5–1.5 s
}
