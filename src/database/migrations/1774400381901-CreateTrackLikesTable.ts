import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTrackLikesTable1774400381901 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE track_likes (
        track_id    UUID        NOT NULL REFERENCES tracks(track_id) ON DELETE CASCADE,
        user_id     UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
        PRIMARY KEY (track_id, user_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_track_likes_user_id
      ON track_likes(user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_track_likes_track_id
      ON track_likes(track_id);
    `);

    // Auto-increment likes_count on tracks when a like is added
    await queryRunner.query(`
      CREATE FUNCTION increment_track_likes_count()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        UPDATE tracks SET likes_count = likes_count + 1
        WHERE track_id = NEW.track_id;
        RETURN NEW;
      END;
      $$;
    `);

    await queryRunner.query(`
      CREATE TRIGGER track_likes_insert_trigger
      AFTER INSERT ON track_likes
      FOR EACH ROW
      EXECUTE FUNCTION increment_track_likes_count();
    `);

    // Auto-decrement likes_count on tracks when a like is removed
    await queryRunner.query(`
      CREATE FUNCTION decrement_track_likes_count()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        UPDATE tracks SET likes_count = GREATEST(likes_count - 1, 0)
        WHERE track_id = OLD.track_id;
        RETURN OLD;
      END;
      $$;
    `);

    await queryRunner.query(`
      CREATE TRIGGER track_likes_delete_trigger
      AFTER DELETE ON track_likes
      FOR EACH ROW
      EXECUTE FUNCTION decrement_track_likes_count();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS track_likes_delete_trigger ON track_likes;
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS decrement_track_likes_count;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS track_likes_insert_trigger ON track_likes;
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS increment_track_likes_count;
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS track_likes CASCADE;`);
  }
}
