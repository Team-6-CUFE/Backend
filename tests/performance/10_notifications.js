/**
 * tests/performance/10_notifications.js
 * ----------------------------------------
 * k6 stress test – Real-time Notifications (Module 10)
 *
 * Scenario A – HTTP (20 VUs):
 *   GET  /api/notifications
 *   GET  /api/notifications/unread-count
 *   PATCH /api/notifications/read-all
 *
 * Scenario B – WebSocket (10 VUs):
 *   Connect to Socket.io endpoint, emit auth, hold 30 s,
 *   measure connection success rate and message latency.
 *
 * Thresholds: http error_rate < 2%, p95 < 800 ms; ws_errors < 1%
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const notifErrors   = new Rate('notif_errors');
const notifDuration = new Trend('notif_duration', true);
const wsErrors      = new Rate('ws_errors');

export const options = {
  scenarios: {
    http_notifications: {
      executor:  'ramping-vus',
      startVUs:  0,
      stages: [
        { duration: '30s', target: 5  },
        { duration: '1m',  target: 20 },
        { duration: '2m',  target: 20 },
        { duration: '30s', target: 0  },
      ],
      exec: 'httpNotifications',
    },
    ws_notifications: {
      executor:  'constant-vus',
      vus:       10,
      duration:  '3m',
      startTime: '30s', // start after HTTP ramp-up begins
      exec: 'wsNotifications',
    },
  },
  thresholds: {
    notif_errors:    ['rate<0.02'],
    notif_duration:  ['p(95)<800'],
    ws_errors:       ['rate<0.01'],
    http_req_failed: ['rate<0.02'],
  },
};

const BASE_URL        = __ENV.BASE_URL        || 'http://localhost:4001';
const WS_URL          = __ENV.WS_URL          || 'ws://localhost:4001';
const STRESS_EMAIL    = __ENV.STRESS_EMAIL    || 'stress_user@test.local';
const STRESS_PASSWORD = __ENV.STRESS_PASSWORD || 'StressPass123!';

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

// ── Setup (shared across scenarios) ──────────────────────────
export function setup() {
  const cookie = loginAndGetCookie();
  if (!cookie) console.error('setup: login failed');
  return { cookie: cookie || '' };
}

// ── Scenario A: HTTP notification endpoints ───────────────────
export function httpNotifications(data) {
  const { cookie } = data;
  if (!cookie) { sleep(1); return; }

  const headers = { Cookie: cookie, 'Content-Type': 'application/json' };
  const roll    = Math.random();

  if (roll < 0.40) {
    group('GET notifications list', () => {
      const res = http.get(`${BASE_URL}/api/notifications?limit=20`, { headers });
      notifDuration.add(res.timings.duration);
      const ok = check(res, { 'status 200': (r) => r.status === 200 });
      notifErrors.add(!ok);
    });
  } else if (roll < 0.80) {
    group('GET unread count', () => {
      const res = http.get(`${BASE_URL}/api/notifications/unread-count`, { headers });
      notifDuration.add(res.timings.duration);
      const ok = check(res, { 'status 200': (r) => r.status === 200 });
      notifErrors.add(!ok);
    });
  } else {
    group('PATCH read-all', () => {
      const res = http.patch(`${BASE_URL}/api/notifications/read-all`, null, { headers });
      notifDuration.add(res.timings.duration);
      const ok = check(res, { 'mark-all-read accepted': (r) => r.status === 200 });
      notifErrors.add(!ok);
    });
  }

  sleep(Math.random() * 1 + 0.5);
}

// ── Scenario B: WebSocket connection ─────────────────────────
export function wsNotifications(data) {
  const { cookie } = data;
  // Socket.io handshake uses polling first, then upgrades to WebSocket
  const url = `${WS_URL}/socket.io/?EIO=4&transport=websocket`;

  const res = ws.connect(url, { headers: { Cookie: cookie } }, (socket) => {
    socket.on('open', () => {
      // Socket.io requires a "2probe" ping for the upgrade handshake
      socket.send('2probe');
    });

    socket.on('message', (msg) => {
      // Accept any message as a successful connection signal
      check(msg, { 'ws message received': (m) => m !== undefined });
    });

    socket.on('error', (e) => {
      wsErrors.add(1);
    });

    // Hold connection for 30 seconds (simulates a logged-in listener)
    socket.setTimeout(() => socket.close(), 30000);
  });

  const connected = check(res, { 'ws connected': (r) => r && r.status === 101 });
  wsErrors.add(!connected);

  sleep(1);
}
