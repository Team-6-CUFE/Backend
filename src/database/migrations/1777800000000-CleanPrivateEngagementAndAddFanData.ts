import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

const AVATAR_URL =
  'https://harmonica-s3-storage-287109772507-us-east-1-an.s3.amazonaws.com/profiles/bb4207da-259a-4338-a24e-3df2911abbd2/avatar_1777219932024.webp';

const FAN_DEMOS = [
  { username: 'superfan1', email: 'superfan1@test.com', firstName: 'Alex', lastName: 'Rivera' },
  { username: 'superfan2', email: 'superfan2@test.com', firstName: 'Jordan', lastName: 'Chen' },
  { username: 'superfan3', email: 'superfan3@test.com', firstName: 'Morgan', lastName: 'Kim' },
  { username: 'superfan4', email: 'superfan4@test.com', firstName: 'Taylor', lastName: 'Patel' },
  { username: 'superfan5', email: 'superfan5@test.com', firstName: 'Casey', lastName: 'Okafor' },
  { username: 'superfan6', email: 'superfan6@test.com', firstName: 'Riley', lastName: 'Santos' },
  { username: 'superfan7', email: 'superfan7@test.com', firstName: 'Drew', lastName: 'Nguyen' },
  { username: 'superfan8', email: 'superfan8@test.com', firstName: 'Jamie', lastName: 'Muller' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export class CleanPrivateEngagementAndAddFanData1777800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── PART 1: Remove engagement on private / hidden tracks ──────────────────
    await queryRunner.query(`
      DELETE FROM track_plays
      WHERE track_id IN (
        SELECT track_id FROM tracks WHERE visibility != 'public' OR hidden = true
      )
    `);
    await queryRunner.query(`
      DELETE FROM track_likes
      WHERE track_id IN (
        SELECT track_id FROM tracks WHERE visibility != 'public' OR hidden = true
      )
    `);
    await queryRunner.query(`
      DELETE FROM track_reposts
      WHERE track_id IN (
        SELECT track_id FROM tracks WHERE visibility != 'public' OR hidden = true
      )
    `);
    await queryRunner.query(`
      DELETE FROM track_comments
      WHERE track_id IN (
        SELECT track_id FROM tracks WHERE visibility != 'public' OR hidden = true
      )
    `);

    // ── PART 2: Remove engagement on private playlists ────────────────────────
    await queryRunner.query(`
      DELETE FROM playlist_likes
      WHERE playlist_id IN (
        SELECT playlist_id FROM playlists WHERE is_public = false
      )
    `);
    await queryRunner.query(`
      DELETE FROM playlist_reposts
      WHERE playlist_id IN (
        SELECT playlist_id FROM playlists WHERE is_public = false
      )
    `);

    // ── PART 3: Recalculate all counts from ground truth ─────────────────────
    await queryRunner.query(`
      UPDATE tracks SET
        likes_count    = (SELECT COUNT(*) FROM track_likes    WHERE track_id = tracks.track_id),
        reposts_count  = (SELECT COUNT(*) FROM track_reposts  WHERE track_id = tracks.track_id),
        comments_count = (SELECT COUNT(*) FROM track_comments WHERE track_id = tracks.track_id),
        play_count     = (SELECT COUNT(*) FROM track_plays    WHERE track_id = tracks.track_id)
    `);
    await queryRunner.query(`
      UPDATE playlists SET
        likes_count   = (SELECT COUNT(*) FROM playlist_likes   WHERE playlist_id = playlists.playlist_id),
        reposts_count = (SELECT COUNT(*) FROM playlist_reposts WHERE playlist_id = playlists.playlist_id)
    `);
    await queryRunner.query(`
      UPDATE users SET
        favorites_count = (SELECT COUNT(*) FROM track_likes   WHERE user_id = users.user_id),
        reposts_count   = (SELECT COUNT(*) FROM track_reposts WHERE user_id = users.user_id)
    `);

    // ── PART 4: Upsert superfan demo users ───────────────────────────────────
    const passwordHash = await bcrypt.hash('Password123', 10);

    for (const fan of FAN_DEMOS) {
      const existing = await queryRunner.query(`SELECT user_id FROM users WHERE username = $1`, [
        fan.username,
      ]);
      if (existing.length > 0) continue;

      await queryRunner.query(
        `
        INSERT INTO users
          (username, password_hash, first_name, last_name, display_name,
           role, plan, is_public, avatar_url, bio)
        VALUES ($1, $2, $3, $4, $5, 'listener', 'free', true, $6, 'Dedicated music fan.')
        `,
        [
          fan.username,
          passwordHash,
          fan.firstName,
          fan.lastName,
          `${fan.firstName} ${fan.lastName}`,
          AVATAR_URL,
        ]
      );

      const [{ user_id: userId }] = await queryRunner.query(
        `SELECT user_id FROM users WHERE username = $1`,
        [fan.username]
      );

      await queryRunner.query(
        `
        INSERT INTO user_emails (email, user_id, is_primary, is_verified, verified_at)
        VALUES ($1, $2, true, true, NOW())
        ON CONFLICT (email) DO NOTHING
        `,
        [fan.email, userId]
      );

      await queryRunner.query(
        `INSERT INTO settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
    }

    // ── PART 5: Gather fan IDs and artist IDs ────────────────────────────────
    const fanRows = await queryRunner.query(
      `SELECT user_id FROM users WHERE username = ANY($1::text[])`,
      [FAN_DEMOS.map((f) => f.username)]
    );
    const fanIds: string[] = fanRows.map((r: { user_id: string }) => r.user_id);

    const artist1Rows = await queryRunner.query(
      `SELECT user_id FROM users WHERE username = 'artist1'`
    );
    const artist2Rows = await queryRunner.query(
      `SELECT user_id FROM users WHERE username = 'artist2'`
    );

    if (artist1Rows.length === 0 || artist2Rows.length === 0) {
      console.warn('artist1 or artist2 not found — skipping fan interaction seeding');
      return;
    }

    const artist1Id: string = artist1Rows[0].user_id;
    const artist2Id: string = artist2Rows[0].user_id;
    const artistIds = [artist1Id, artist2Id];

    // Get up to 3 public, non-hidden tracks per artist
    const a1Tracks = await queryRunner.query(
      `SELECT track_id, user_id, COALESCE(release_date, created_at) AS ref_date
       FROM tracks
       WHERE user_id = $1 AND visibility = 'public' AND hidden = false
       ORDER BY created_at
       LIMIT 3`,
      [artist1Id]
    );
    const a2Tracks = await queryRunner.query(
      `SELECT track_id, user_id, COALESCE(release_date, created_at) AS ref_date
       FROM tracks
       WHERE user_id = $1 AND visibility = 'public' AND hidden = false
       ORDER BY created_at
       LIMIT 3`,
      [artist2Id]
    );

    const featuredTracks: { track_id: string; user_id: string; ref_date: string }[] = [
      ...a1Tracks,
      ...a2Tracks,
    ];

    if (featuredTracks.length === 0) {
      console.warn('No public tracks found for artist1/artist2 — skipping fan interaction seeding');
      return;
    }

    // ── PART 6: Fans follow both artists ─────────────────────────────────────
    for (const fanId of fanIds) {
      for (const artistId of artistIds) {
        await queryRunner.query(
          `INSERT INTO user_follows (follower, followed) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [fanId, artistId]
        );
      }
    }

    // ── PART 7: Fans like all featured tracks ─────────────────────────────────
    for (const fanId of fanIds) {
      for (const track of featuredTracks) {
        await queryRunner.query(
          `INSERT INTO track_likes (track_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [track.track_id, fanId]
        );
      }
    }

    // ── PART 8: Seed plays — 10 within first-7-day window + 10 after ─────────
    for (const track of featuredTracks) {
      const releaseDate = new Date(track.ref_date);
      const windowEnd = new Date(releaseDate.getTime() + 7 * DAY_MS);

      // Build all (track_id, user_id, played_at) tuples for this track
      const plays: [string, string, Date][] = [];
      for (const fanId of fanIds) {
        // 10 plays spread across the first 6 days of the window
        for (let i = 0; i < 10; i++) {
          plays.push([
            track.track_id,
            fanId,
            new Date(releaseDate.getTime() + (i / 10) * 6 * DAY_MS),
          ]);
        }
        // 10 plays after the window (one every 2 days)
        for (let i = 0; i < 10; i++) {
          plays.push([track.track_id, fanId, new Date(windowEnd.getTime() + (i + 1) * 2 * DAY_MS)]);
        }
      }

      // Insert in batches of 100 rows
      const BATCH_SIZE = 100;
      for (let b = 0; b < plays.length; b += BATCH_SIZE) {
        const batch = plays.slice(b, b + BATCH_SIZE);
        const placeholders = batch
          .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3}, NULL)`)
          .join(', ');
        const params = batch.flatMap(([tid, uid, ts]) => [tid, uid, ts]);
        await queryRunner.query(
          `INSERT INTO track_plays (track_id, user_id, played_at, playlist_id) VALUES ${placeholders}`,
          params
        );
      }
    }

    // ── PART 9: Persist first-fan snapshots via SQL ───────────────────────────
    for (const track of featuredTracks) {
      await queryRunner.query(
        `
        INSERT INTO track_first_fans (track_id, user_id, play_count)
        SELECT
          tp.track_id,
          tp.user_id,
          COUNT(*)::int AS play_count
        FROM track_plays tp
        JOIN tracks t  ON t.track_id = tp.track_id
        JOIN users  u  ON u.user_id  = tp.user_id
        WHERE tp.track_id = $1
          AND tp.played_at <= t.created_at + INTERVAL '7 days'
          AND EXISTS (
            SELECT 1 FROM user_follows uf
            WHERE uf.follower = tp.user_id AND uf.followed = t.user_id
          )
          AND EXISTS (
            SELECT 1 FROM track_likes tl
            WHERE tl.user_id = tp.user_id AND tl.track_id = tp.track_id
          )
          AND u.avatar_url IS NOT NULL AND u.avatar_url != ''
          AND EXISTS (
            SELECT 1 FROM settings s
            WHERE s.user_id = tp.user_id AND s.show_when_top_or_first_fan = true
          )
        GROUP BY tp.track_id, tp.user_id
        ORDER BY play_count DESC
        LIMIT 5
        ON CONFLICT (track_id, user_id) DO UPDATE SET play_count = EXCLUDED.play_count
        `,
        [track.track_id]
      );
    }

    // ── PART 10: Upsert recently_played for fans ──────────────────────────────
    await queryRunner.query(
      `
      INSERT INTO recently_played (user_id, item_id, item_type, played_at)
      SELECT
        tp.user_id,
        t.user_id              AS item_id,
        'artist'::recently_played_item_type,
        MAX(tp.played_at)      AS played_at
      FROM track_plays tp
      JOIN tracks t ON t.track_id = tp.track_id
      WHERE tp.user_id = ANY($1::uuid[])
      GROUP BY tp.user_id, t.user_id
      ON CONFLICT (user_id, item_id, item_type) DO UPDATE SET played_at = EXCLUDED.played_at
      `,
      [fanIds]
    );

    console.log('Migration complete:');
    console.log('  - Private engagement cleaned');
    console.log('  - All counts recalculated from ground truth');
    console.log(`  - ${FAN_DEMOS.length} superfan users upserted`);
    console.log(`  - Fan follows, likes, and plays inserted for ${featuredTracks.length} tracks`);
    console.log('  - First-fan snapshots and recently_played updated');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the fan users (CASCADE handles follows, likes, plays, first_fans, recently_played)
    await queryRunner.query(`DELETE FROM users WHERE username = ANY($1::text[])`, [
      FAN_DEMOS.map((f) => f.username),
    ]);
    // Count recalculation and engagement deletion cannot be meaningfully reversed.
  }
}
