/**
 * tests/performance/05_streaming_playback.js
 * ------------------------------------------
 * k6 stress test – Streaming Engine & Playback (Module 5)
 * Routes:
 *   GET  /api/tracks/:id/stream          (fetch audio URL / redirect — not byte streaming)
 *   POST /api/tracks/:id/play            (record a play event)
 *   GET  /api/tracks/:username/:title/related-tracks
 *
 * Note: We test the app-server hop (auth check, DB look-up, redirect generation),
 *       not actual S3/CDN byte delivery.
 *
 * Thresholds: <2% errors, p95 < 800 ms
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const streamErrors   = new Rate('stream_errors');
const streamDuration = new Trend('stream_duration', true);

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m',  target: 40 },
    { duration: '2m',  target: 40 },
    { duration: '30s', target: 0  },
  ],
  thresholds: {
    stream_errors:   ['rate<0.02'],
    stream_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.02'],
  },
};

const BASE_URL        = __ENV.BASE_URL        || 'http://localhost:4001';
const STRESS_EMAIL    = __ENV.STRESS_EMAIL    || 'stress_user@test.local';
const STRESS_PASSWORD = __ENV.STRESS_PASSWORD || 'StressPass123!';

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
  if (!cookie) {
    console.error('setup: login failed');
    return { cookie: null, tracks: [] };
  }

  const meRes = http.get(`${BASE_URL}/api/profile/me`, jsonHeaders(cookie));
  let userId = null;
  if (meRes.status === 200) {
    try {
      const body = JSON.parse(meRes.body);
      userId = body.userId || body.user_id;
    } catch (_) {}
  }

  let tracks = [];
  if (userId) {
    const tracksRes = http.get(
      `${BASE_URL}/api/tracks/users/${userId}/tracks?limit=20`,
      jsonHeaders(cookie)
    );
    if (tracksRes.status === 200) {
      try {
        const body = JSON.parse(tracksRes.body);
        const items = body.data || body.tracks || body || [];
        tracks = items.slice(0, 20).map((t) => ({
          id:       t.trackId || t.track_id,
          title:    t.title,
          username: 'stress_user',
        })).filter((t) => t.id);
      } catch (_) {}
    }
  }

  console.log(`setup: ${tracks.length} tracks ready for streaming tests`);
  return { cookie, tracks };
}

// ── Main test ─────────────────────────────────────────────────
export default function (data) {
  const { cookie, tracks } = data;
  if (!cookie || tracks.length === 0) {
    sleep(1);
    return;
  }

  const track = tracks[Math.floor(Math.random() * tracks.length)];
  const roll = Math.random();

  if (roll < 0.50) {
    // ── Fetch stream URL (auth check + DB read + redirect) ────
    group('GET stream URL', () => {
      // redirects=false so we measure the app-server response, not the S3 hop
      const res = http.get(
        `${BASE_URL}/api/tracks/${track.id}/stream`,
        { headers: { Cookie: cookie }, redirects: 0 }
      );
      streamDuration.add(res.timings.duration);
      // Expect 302 redirect to S3 OR 200 if URL is returned as JSON
      const ok = check(res, {
        'stream endpoint responds': (r) => r.status === 200 || r.status === 302 || r.status === 301,
      });
      streamErrors.add(!ok);
    });
  } else if (roll < 0.80) {
    // ── Record a play event ───────────────────────────────────
    group('POST play', () => {
      const res = http.post(
        `${BASE_URL}/api/tracks/${track.id}/play`,
        null,
        jsonHeaders(cookie)
      );
      streamDuration.add(res.timings.duration);
      const ok = check(res, {
        'play recorded': (r) => r.status === 200 || r.status === 201,
      });
      streamErrors.add(!ok);
    });
  } else {
    // ── Related tracks ────────────────────────────────────────
    group('GET related tracks', () => {
      const title = encodeURIComponent(track.title || 'test');
      const res = http.get(
        `${BASE_URL}/api/tracks/${track.username}/${title}/related-tracks`,
        { headers: { Cookie: cookie } }
      );
      streamDuration.add(res.timings.duration);
      const ok = check(res, {
        'status 200': (r) => r.status === 200,
      });
      streamErrors.add(!ok);
    });
  }

  sleep(Math.random() * 0.8 + 0.2); // 0.2–1 s (streaming is fast, simulate rapid skips)
}
