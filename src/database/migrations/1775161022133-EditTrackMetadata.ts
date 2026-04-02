import { MigrationInterface, QueryRunner } from 'typeorm';

export class EditTrackMetadata1775161022133 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create the new visibility enum type
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE track_visibility_enum AS ENUM ('public', 'private', 'follower_exclusive');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // 2. Add all new columns
    await queryRunner.query(`
      ALTER TABLE tracks
        ADD COLUMN IF NOT EXISTS audio_url_hq            VARCHAR(500),
        ADD COLUMN IF NOT EXISTS main_artists            TEXT[],
        ADD COLUMN IF NOT EXISTS buy_link                VARCHAR(500),
        ADD COLUMN IF NOT EXISTS record_label            VARCHAR(255),
        ADD COLUMN IF NOT EXISTS release_date            DATE,
        ADD COLUMN IF NOT EXISTS publisher               VARCHAR(255),
        ADD COLUMN IF NOT EXISTS isrc                    VARCHAR(20),
        ADD COLUMN IF NOT EXISTS explicit_content        BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS p_line                  VARCHAR(500),
        ADD COLUMN IF NOT EXISTS track_link              VARCHAR(500),
        ADD COLUMN IF NOT EXISTS enable_direct_downloads BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS offline_listening       BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS attribution             BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS noncommercial           BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS no_derivative_works     BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS share_alike             BOOLEAN NOT NULL DEFAULT false
    `);

    // 3. Migrate is_public (boolean) → visibility (track_visibility_enum)
    await queryRunner.query(`
      ALTER TABLE tracks
        ADD COLUMN IF NOT EXISTS visibility track_visibility_enum NOT NULL DEFAULT 'public'
    `);

    await queryRunner.query(`
      UPDATE tracks
        SET visibility = CASE
          WHEN is_public = true  THEN 'public'::track_visibility_enum
          ELSE                        'private'::track_visibility_enum
        END
    `);

    await queryRunner.query(`ALTER TABLE tracks DROP COLUMN IF EXISTS is_public`);

    // 4. Update index to use new visibility column
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tracks_is_public`);
    await queryRunner.query(`
      CREATE INDEX idx_tracks_visibility ON tracks(visibility)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore is_public boolean from visibility
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tracks_visibility`);

    await queryRunner.query(`
      ALTER TABLE tracks ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      UPDATE tracks
        SET is_public = CASE
          WHEN visibility = 'public' THEN true
          ELSE false
        END
    `);
    await queryRunner.query(`ALTER TABLE tracks DROP COLUMN IF EXISTS visibility`);
    await queryRunner.query(`DROP TYPE IF EXISTS track_visibility_enum`);

    await queryRunner.query(`
      CREATE INDEX idx_tracks_is_public ON tracks(is_public)
    `);

    // Drop added columns
    await queryRunner.query(`
      ALTER TABLE tracks
        DROP COLUMN IF EXISTS audio_url_hq,
        DROP COLUMN IF EXISTS main_artists,
        DROP COLUMN IF EXISTS buy_link,
        DROP COLUMN IF EXISTS record_label,
        DROP COLUMN IF EXISTS release_date,
        DROP COLUMN IF EXISTS publisher,
        DROP COLUMN IF EXISTS isrc,
        DROP COLUMN IF EXISTS explicit_content,
        DROP COLUMN IF EXISTS p_line,
        DROP COLUMN IF EXISTS track_link,
        DROP COLUMN IF EXISTS enable_direct_downloads,
        DROP COLUMN IF EXISTS offline_listening,
        DROP COLUMN IF EXISTS attribution,
        DROP COLUMN IF EXISTS noncommercial,
        DROP COLUMN IF EXISTS no_derivative_works,
        DROP COLUMN IF EXISTS share_alike
    `);
  }
}
