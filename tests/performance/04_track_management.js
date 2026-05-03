/**
 * tests/performance/04_track_management.js
 * ------------------------------------------
 * k6 stress test – Track Management (Module 4)
 * Routes:
 *   GET  /api/tracks/:id
 *   POST /api/tracks/:id/like
 *   DELETE /api/tracks/:id/like
 *   POST /api/tracks/:id/comment
 *   GET  /api/tracks/:id/comments
 *
 * Strategy:
 *   - setup() logs in once and fetches seeded track IDs
 *   - Each VU cycles through like→unlike and comment→read
 *   - Thresholds: <2% errors, p95 < 1000 ms
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const trackErrors   = new Rate('track_errors');
const trackDuration = new Trend('track_duration', true);

export const options = {
  stages: [
    { duration: '30s', target: 5  },
    { duration: '1m',  target: 25 },
    { duration: '2m',  target: 25 },
    { duration: '30s', target: 0  },
  ],
  thresholds: {
    track_errors:    ['rate<0.02'],
    track_duration:  ['p(95)<1000'],
    http_req_failed: ['rate<0.02'],
  },
};

const BASE_URL        = __ENV.BASE_URL        || 'http://localhost:4001';
const STRESS_EMAIL    = __ENV.STRESS_EMAIL    || 'stress_user@test.local';
const STRESS_PASSWORD = __ENV.STRESS_PASSWORD || 'StressPass123!';

// ── Helpers ───────────────────────────────────────────────────
function jsonHeaders(cookie) {
  return {
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
  };
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

// ── Setup (runs once before VUs start) ───────────────────────
export function setup() {
  const cookie = loginAndGetCookie();
  if (!cookie) {
    console.error('setup: login failed');
    return { cookie: null, trackIds: [], userId: null };
  }

  // Get current user profile to retrieve user_id
  const meRes = http.get(`${BASE_URL}/api/profile/me`, jsonHeaders(cookie));
  let userId = null;
  if (meRes.status === 200) {
    try {
      userId = JSON.parse(meRes.body).userId || JSON.parse(meRes.body).user_id;
    } catch (_) {}
  }

  // Fetch the user's tracks
  let trackIds = [];
  if (userId) {
    const tracksRes = http.get(
      `${BASE_URL}/api/tracks/users/${userId}/tracks?limit=20`,
      jsonHeaders(cookie)
    );
    if (tracksRes.status === 200) {
      try {
        const body = JSON.parse(tracksRes.body);
        const items = body.data || body.tracks || body || [];
        trackIds = items.slice(0, 20).map((t) => t.trackId || t.track_id).filter(Boolean);
      } catch (_) {}
    }
  }

  console.log(`setup: found ${trackIds.length} tracks for stress testing`);
  return { cookie, trackIds, userId };
}

// ── Main test ─────────────────────────────────────────────────
export default function (data) {
  const { cookie, trackIds } = data;
  if (!cookie || trackIds.length === 0) {
    sleep(1);
    return;
  }

  const trackId = trackIds[Math.floor(Math.random() * trackIds.length)];
  const roll = Math.random();

  if (roll < 0.35) {
    // ── Fetch track metadata ──────────────────────────────────
    group('GET track', () => {
      const res = http.get(`${BASE_URL}/api/tracks/${trackId}`, { headers: { Cookie: cookie } });
      trackDuration.add(res.timings.duration);
      const ok = check(res, {
        'status 200': (r) => r.status === 200,
        'has trackId': (r) => r.body.includes('trackId') || r.body.includes('track_id'),
      });
      trackErrors.add(!ok);
    });
  } else if (roll < 0.55) {
    // ── Like then unlike (cycle to avoid conflicts) ───────────
    group('like / unlike', () => {
      const likeRes = http.post(
        `${BASE_URL}/api/tracks/${trackId}/like`,
        null,
        jsonHeaders(cookie)
      );
      trackDuration.add(likeRes.timings.duration);
      // 200 = liked, 409 = already liked (both acceptable under load)
      const likeOk = check(likeRes, {
        'like accepted': (r) => r.status === 200 || r.status === 201 || r.status === 409,
      });
      trackErrors.add(!likeOk);

      sleep(0.1);

      const unlikeRes = http.del(
        `${BASE_URL}/api/tracks/${trackId}/like`,
        null,
        jsonHeaders(cookie)
      );
      trackDuration.add(unlikeRes.timings.duration);
      const unlikeOk = check(unlikeRes, {
        'unlike accepted': (r) => r.status === 200 || r.status === 404,
      });
      trackErrors.add(!unlikeOk);
    });
  } else if (roll < 0.70) {
    // ── Post a comment ────────────────────────────────────────
    group('POST comment', () => {
      const res = http.post(
        `${BASE_URL}/api/tracks/${trackId}/comment`,
        JSON.stringify({ content: 'Stress test comment', timestampSeconds: 30 }),
        jsonHeaders(cookie)
      );
      trackDuration.add(res.timings.duration);
      const ok = check(res, {
        'comment created': (r) => r.status === 200 || r.status === 201,
      });
      trackErrors.add(!ok);
    });
  } else {
    // ── Fetch comments ────────────────────────────────────────
    group('GET comments', () => {
      const res = http.get(
        `${BASE_URL}/api/tracks/${trackId}/comments?limit=20`,
        { headers: { Cookie: cookie } }
      );
      trackDuration.add(res.timings.duration);
      const ok = check(res, {
        'status 200': (r) => r.status === 200,
      });
      trackErrors.add(!ok);
    });
  }

  sleep(Math.random() * 1 + 0.3); // 0.3–1.3 s
}
