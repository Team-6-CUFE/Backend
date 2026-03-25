import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTracksTable1774400357584 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE track_status_enum AS ENUM ('processing', 'finished', 'failed');
    `);

    await queryRunner.query(`
      CREATE TABLE tracks (
        track_id        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        title           VARCHAR(255)  NOT NULL,
        description     TEXT,
        audio_url       VARCHAR(500)  NOT NULL,
        cover_image     VARCHAR(500),
        duration_seconds INT          NOT NULL DEFAULT 0,
        is_public       BOOLEAN       NOT NULL DEFAULT true,
        hidden          BOOLEAN       NOT NULL DEFAULT false,
        track_status    track_status_enum NOT NULL DEFAULT 'processing',
        blocked_regions TEXT[]        NOT NULL DEFAULT '{}',
        preview_audio_url VARCHAR(500),
        waveform_url    VARCHAR(500) NOT NULL,
        play_count      INT           NOT NULL DEFAULT 0,
        likes_count     INT           NOT NULL DEFAULT 0,
        reposts_count   INT           NOT NULL DEFAULT 0,
        comments_count  INT           NOT NULL DEFAULT 0,
        created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP     NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_tracks_user_id
      ON tracks(user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_tracks_is_public
      ON tracks(is_public);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_tracks_track_status
      ON tracks(track_status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_tracks_created_at
      ON tracks(created_at DESC);
    `);

    await queryRunner.query(`
      CREATE FUNCTION update_tracks_updated_at()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$;
    `);

    await queryRunner.query(`
      CREATE TRIGGER tracks_updated_at_trigger
      BEFORE UPDATE ON tracks
      FOR EACH ROW
      EXECUTE FUNCTION update_tracks_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS tracks_updated_at_trigger ON tracks;
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_tracks_updated_at;
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS tracks CASCADE;`);

    await queryRunner.query(`DROP TYPE IF EXISTS track_status_enum;`);
  }
}
