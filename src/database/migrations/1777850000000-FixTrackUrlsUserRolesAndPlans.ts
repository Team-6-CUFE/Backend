import { MigrationInterface, QueryRunner } from 'typeorm';

const S3_BASE =
  'https://harmonica-s3-storage-287109772507-us-east-1-an.s3.amazonaws.com/tracks/12dad54c-5a07-42db-94c1-33c4867a30e7';

// Duration of the shared placeholder audio file in seconds
const PLACEHOLDER_DURATION = 248;

// Identifier fragments for every placeholder track ID used in the factory over time.
// Real user-uploaded tracks have their OWN track UUID in the S3 path and are untouched.
const OLD_PLACEHOLDER_IDS = [
  'cdn.soundcloud-clone.com', // original fake CDN
  '594929cf-87b3-4461-a80f-c2572fed8107', // first S3 placeholder
];

export class FixTrackUrlsUserRolesAndPlans1777850000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── PART 1: Replace outdated placeholder track URLs with current S3 URLs ──
    for (const oldId of OLD_PLACEHOLDER_IDS) {
      await queryRunner.query(`UPDATE tracks SET audio_url = $1 WHERE audio_url LIKE $2`, [
        `${S3_BASE}/Sahy_Men_El_Nom_standard.mp3`,
        `%${oldId}%`,
      ]);
      await queryRunner.query(
        `UPDATE tracks SET preview_audio_url = $1 WHERE preview_audio_url LIKE $2`,
        [`${S3_BASE}/Sahy_Men_El_Nom_preview.mp3`, `%${oldId}%`]
      );
      await queryRunner.query(`UPDATE tracks SET waveform_url = $1 WHERE waveform_url LIKE $2`, [
        `${S3_BASE}/waveform.json`,
        `%${oldId}%`,
      ]);
      // Backfill hq URL — covers rows where it was null or also had the old ID
      await queryRunner.query(
        `UPDATE tracks
         SET audio_url_hq = $1
         WHERE audio_url_hq LIKE $2
            OR (audio_url_hq IS NULL AND audio_url LIKE $2)`,
        [`${S3_BASE}/Sahy_Men_El_Nom_hq.mp3`, `%${oldId}%`]
      );
    }

    // ── PART 2: Set correct duration for all placeholder tracks ───────────────
    // Covers tracks already using the current S3 URL before this migration ran,
    // as well as the rows just updated above.
    await queryRunner.query(`UPDATE tracks SET duration_seconds = $1 WHERE audio_url = $2`, [
      PLACEHOLDER_DURATION,
      `${S3_BASE}/Sahy_Men_El_Nom_standard.mp3`,
    ]);

    // ── PART 3: Fix specific user plans ──────────────────────────────────────
    await queryRunner.query(`UPDATE users SET plan = 'pro'  WHERE username = 'artist2'`);
    await queryRunner.query(`UPDATE users SET plan = 'go+'  WHERE username = 'listener2'`);
    await queryRunner.query(`UPDATE users SET plan = 'pro'  WHERE username = 'trending_music'`);

    // ── PART 4: Sync all user roles to the plan rule ─────────────────────────
    // Runs after plan fixes so artist2 / trending_music get 'artist'.
    // Admin users are excluded.
    await queryRunner.query(`
      UPDATE users
      SET role = CASE WHEN plan = 'pro' THEN 'artist' ELSE 'listener' END
      WHERE role != 'admin'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn('FixTrackUrlsUserRolesAndPlans: down() is a no-op — changes are not reversible.');
  }
}
