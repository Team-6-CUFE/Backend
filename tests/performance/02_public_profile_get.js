/**
 * tests/performance/02_public_profile_get.js
 * ------------------------------------------
 * k6 stress test – Public Profile GET flow
 * Target: GET /api/profile/:username  (marked @Public – no auth needed)
 *
 * Strategy:
 *   - Read-heavy workload simulating many anonymous visitors
 *   - Uses a pre-seeded username in the stress DB
 *   - Also hits GET /api/profile/check-username?username=...
 *   - Gradual ramp-up to 50 VUs (heavier read load)
 *   - Thresholds: <1% errors, p95 < 800 ms
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Custom metrics ──────────────────────────────────────────
const profileErrors = new Rate('profile_errors');
const profileDuration = new Trend('profile_duration', true);

// ── Options ──────────────────────────────────────────────────
export const options = {
    stages: [
        { duration: '30s', target: 10 },  // warm up
        { duration: '1m', target: 50 },  // ramp to 50 VUs
        { duration: '2m', target: 50 },  // hold
        { duration: '30s', target: 0 },   // ramp down
    ],
    thresholds: {
        profile_errors: ['rate<0.01'],
        profile_duration: ['p(95)<800'],
        http_req_failed: ['rate<0.01'],
    },
};

// ── Config ────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4001';

// A username that exists in your SoundCloud_stress seed data
const TEST_USERNAME = __ENV.STRESS_USERNAME || 'stress_user';

// ── Main test function ────────────────────────────────────────
export default function () {
    // --- 1. Fetch public profile by username ---
    group('GET public profile', () => {
        const res = http.get(`${BASE_URL}/api/profile/${TEST_USERNAME}`);

        profileDuration.add(res.timings.duration);

        const success = check(res, {
            'status is 200': (r) => r.status === 200,
            'body is not empty': (r) => r.body && r.body.length > 0,
            'response time < 1s': (r) => r.timings.duration < 1000,
        });

        profileErrors.add(!success);
    });

    sleep(0.3);

    // --- 2. Check username availability ---
    group('GET check-username', () => {
        const res = http.get(
            `${BASE_URL}/api/profile/check-username?username=${TEST_USERNAME}`
        );

        check(res, {
            'status is 200 or 409': (r) => r.status === 200 || r.status === 409,
        });
    });

    sleep(Math.random() * 0.5 + 0.2); // 0.2–0.7 s think time
}
