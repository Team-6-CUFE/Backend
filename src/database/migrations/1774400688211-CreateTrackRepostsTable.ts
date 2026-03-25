import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTrackRepostsTable1774400688211 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE track_reposts (
        user_id     UUID          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        track_id    UUID          NOT NULL REFERENCES tracks(track_id) ON DELETE CASCADE,
        caption     VARCHAR(500),
        created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, track_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_track_reposts_track_id
      ON track_reposts(track_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_track_reposts_user_id
      ON track_reposts(user_id);
    `);

    // Auto-increment reposts_count on tracks when a repost is added
    await queryRunner.query(`
      CREATE FUNCTION increment_track_reposts_count()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        UPDATE tracks SET reposts_count = reposts_count + 1
        WHERE track_id = NEW.track_id;
        RETURN NEW;
      END;
      $$;
    `);

    await queryRunner.query(`
      CREATE TRIGGER track_reposts_insert_trigger
      AFTER INSERT ON track_reposts
      FOR EACH ROW
      EXECUTE FUNCTION increment_track_reposts_count();
    `);

    // Auto-decrement reposts_count on tracks when a repost is removed
    await queryRunner.query(`
      CREATE FUNCTION decrement_track_reposts_count()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        UPDATE tracks SET reposts_count = GREATEST(reposts_count - 1, 0)
        WHERE track_id = OLD.track_id;
        RETURN OLD;
      END;
      $$;
    `);

    await queryRunner.query(`
      CREATE TRIGGER track_reposts_delete_trigger
      AFTER DELETE ON track_reposts
      FOR EACH ROW
      EXECUTE FUNCTION decrement_track_reposts_count();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS track_reposts_delete_trigger ON track_reposts;
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS decrement_track_reposts_count;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS track_reposts_insert_trigger ON track_reposts;
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS increment_track_reposts_count;
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS track_reposts CASCADE;`);
  }
}
