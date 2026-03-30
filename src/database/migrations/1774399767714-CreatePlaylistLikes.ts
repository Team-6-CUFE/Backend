import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlaylistLikesTable1773368421894 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create the table
    await queryRunner.query(`
      CREATE TABLE playlist_likes (
        playlist_id UUID NOT NULL REFERENCES playlists(playlist_id) ON DELETE CASCADE,
        user_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (playlist_id, user_id)
      );
    `);

    // Index to quickly find all playlists a specific user has liked
    await queryRunner.query(`CREATE INDEX idx_playlist_likes_user_id ON playlist_likes(user_id);`);

    // 2. Create the Trigger Functions
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION increment_playlist_likes()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE playlists SET likes_count = likes_count + 1 WHERE playlist_id = NEW.playlist_id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION decrement_playlist_likes()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE playlists SET likes_count = likes_count - 1 WHERE playlist_id = OLD.playlist_id;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 3. Attach the Triggers to the table
    await queryRunner.query(`
      CREATE TRIGGER trigger_increment_likes
      AFTER INSERT ON playlist_likes
      FOR EACH ROW EXECUTE FUNCTION increment_playlist_likes();
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_decrement_likes
      AFTER DELETE ON playlist_likes
      FOR EACH ROW EXECUTE FUNCTION decrement_playlist_likes();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS playlist_likes CASCADE;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS increment_playlist_likes;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS decrement_playlist_likes;`);
  }
}
