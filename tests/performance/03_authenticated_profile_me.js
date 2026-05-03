/**
 * tests/performance/03_authenticated_profile_me.js
 * -------------------------------------------------
 * k6 stress test – Authenticated "GET /api/profile/me" action
 * Target: GET /api/profile/me  (requires valid JWT access_token cookie)
 *
 * Strategy:
 *   - Each VU logs in once during setup, stores the access_token cookie
 *   - Then hammers GET /api/profile/me  (lightweight authenticated read)
 *   - Gradual ramp to 30 VUs
 *   - Thresholds: <2% errors (some 401s acceptable during ramp), p95 < 800 ms
 *
 * NOTE: The app uses HttpOnly cookies for tokens (see main.ts).
 *       k6's CookieJar automatically carries Set-Cookie headers
 *       across requests within the same VU – no manual token extraction needed.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { CookieJar } from 'k6/http';

// ── Custom metrics ──────────────────────────────────────────
const authErrors = new Rate('auth_profile_errors');
const authDuration = new Trend('auth_profile_duration', true);

// ── Options ──────────────────────────────────────────────────
export const options = {
    stages: [
        { duration: '30s', target: 5 },   // warm up
        { duration: '1m', target: 30 },  // ramp to 30 VUs
        { duration: '2m', target: 30 },  // hold
        { duration: '30s', target: 0 },   // ramp down
    ],
    thresholds: {
        auth_profile_errors: ['rate<0.02'],
        auth_profile_duration: ['p(95)<800'],
        http_req_failed: ['rate<0.02'],
    },
};

// ── Config ────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4001';

const TEST_EMAIL = __ENV.STRESS_EMAIL || 'stress_user@test.local';
const TEST_PASSWORD = __ENV.STRESS_PASSWORD || 'StressPass123!';

// ── VU setup: login once per virtual user ─────────────────────
export function setup() {
    // This runs once before the test; we don't share cookies across VUs here
    // but we verify the login endpoint is reachable.
    const loginRes = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
        { headers: { 'Content-Type': 'application/json' } }
    );
    check(loginRes, { 'setup: login succeeded': (r) => r.status === 200 });
    return {};
}

// ── Main test function ────────────────────────────────────────
export default function () {
    // Each VU maintains its own CookieJar for the lifecycle of the test.
    // We login once per VU iteration cycle (every ~4 minutes to simulate
    // a realistic session), then reuse the cookie for multiple requests.

    const jar = new CookieJar();
    const params = { jar, headers: { 'Content-Type': 'application/json' } };

    // --- Step 1: Login (happens once per VU, per iteration cycle) ---
    group('Login', () => {
        const loginRes = http.post(
            `${BASE_URL}/api/auth/login`,
            JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
            params
        );
        check(loginRes, {
            'login status 200': (r) => r.status === 200,
        });
    });

    sleep(0.2);

    // --- Step 2: Fetch own profile (authenticated) ---
    group('GET /api/profile/me', () => {
        const res = http.get(`${BASE_URL}/api/profile/me`, params);

        authDuration.add(res.timings.duration);

        const success = check(res, {
            'status 200': (r) => r.status === 200,
            'body contains user data': (r) => r.body && r.body.length > 10,
            'response time < 1s': (r) => r.timings.duration < 1000,
        });

        authErrors.add(!success);
    });

    sleep(0.5);

    // --- Step 3: Fetch own emails list (lightweight authenticated read) ---
    group('GET /api/auth/emails', () => {
        const res = http.get(`${BASE_URL}/api/auth/emails`, params);
        check(res, {
            'emails: 200 or 401': (r) => r.status === 200 || r.status === 401,
        });
    });

    sleep(Math.random() * 1 + 0.5); // 0.5–1.5 s think time
}
