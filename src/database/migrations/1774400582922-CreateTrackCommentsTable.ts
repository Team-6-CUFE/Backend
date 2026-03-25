import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTrackCommentsTable1774400582922 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE track_comments (
        comment_id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        track_id            UUID          NOT NULL REFERENCES tracks(track_id) ON DELETE CASCADE,
        user_id             UUID          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        content             TEXT          NOT NULL,
        timestamp_seconds   INT           NOT NULL DEFAULT 0,
        created_at          TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMP     NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_track_comments_track_id
      ON track_comments(track_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_track_comments_user_id
      ON track_comments(user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_track_comments_created_at
      ON track_comments(created_at DESC);
    `);

    await queryRunner.query(`
      CREATE FUNCTION update_track_comments_updated_at()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$;
    `);

    await queryRunner.query(`
      CREATE TRIGGER track_comments_updated_at_trigger
      BEFORE UPDATE ON track_comments
      FOR EACH ROW
      EXECUTE FUNCTION update_track_comments_updated_at();
    `);

    // Auto-increment comments_count on tracks when a comment is added
    await queryRunner.query(`
      CREATE FUNCTION increment_track_comments_count()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        UPDATE tracks SET comments_count = comments_count + 1
        WHERE track_id = NEW.track_id;
        RETURN NEW;
      END;
      $$;
    `);

    await queryRunner.query(`
      CREATE TRIGGER track_comments_insert_trigger
      AFTER INSERT ON track_comments
      FOR EACH ROW
      EXECUTE FUNCTION increment_track_comments_count();
    `);

    // Auto-decrement comments_count on tracks when a comment is deleted
    await queryRunner.query(`
      CREATE FUNCTION decrement_track_comments_count()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        UPDATE tracks SET comments_count = GREATEST(comments_count - 1, 0)
        WHERE track_id = OLD.track_id;
        RETURN OLD;
      END;
      $$;
    `);

    await queryRunner.query(`
      CREATE TRIGGER track_comments_delete_trigger
      AFTER DELETE ON track_comments
      FOR EACH ROW
      EXECUTE FUNCTION decrement_track_comments_count();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS track_comments_delete_trigger ON track_comments;
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS decrement_track_comments_count;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS track_comments_insert_trigger ON track_comments;
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS increment_track_comments_count;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS track_comments_updated_at_trigger ON track_comments;
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_track_comments_updated_at;
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS track_comments CASCADE;`);
  }
}
