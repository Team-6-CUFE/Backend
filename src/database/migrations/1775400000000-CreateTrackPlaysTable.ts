import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTrackPlaysTable1775400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE track_plays (
        track_play_id   UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
        track_id        UUID                     NOT NULL REFERENCES tracks(track_id) ON DELETE CASCADE,
        user_id         UUID                     NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        played_at       TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
        playlist_id     UUID                     REFERENCES playlists(playlist_id) ON DELETE SET NULL
      );
    `);

    // Listening history: fetch all plays for a user ordered by recency
    await queryRunner.query(`
      CREATE INDEX idx_track_plays_user_played_at
      ON track_plays(user_id, played_at DESC);
    `);

    // Top fans (most plays): count plays per user per track
    await queryRunner.query(`
      CREATE INDEX idx_track_plays_track_user
      ON track_plays(track_id, user_id);
    `);

    // First fans: find who played within the first 7 days of release
    await queryRunner.query(`
      CREATE INDEX idx_track_plays_track_played_at
      ON track_plays(track_id, played_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_track_plays_track_played_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_track_plays_track_user;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_track_plays_user_played_at;`);
    await queryRunner.query(`DROP TABLE IF EXISTS track_plays CASCADE;`);
  }
}
