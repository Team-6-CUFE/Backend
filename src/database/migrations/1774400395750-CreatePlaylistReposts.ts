import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlaylistRepostsTable1773368421895 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create the table
    await queryRunner.query(`
      CREATE TABLE playlist_reposts (
        user_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        playlist_id UUID NOT NULL REFERENCES playlists(playlist_id) ON DELETE CASCADE,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, playlist_id)
      );
    `);

    // Index to quickly find all users who reposted a specific playlist
    await queryRunner.query(
      `CREATE INDEX idx_playlist_reposts_playlist_id ON playlist_reposts(playlist_id);`
    );

    // 2. Create the Trigger Functions
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION increment_playlist_reposts()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE playlists SET reposts_count = reposts_count + 1 WHERE playlist_id = NEW.playlist_id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION decrement_playlist_reposts()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE playlists SET reposts_count = reposts_count - 1 WHERE playlist_id = OLD.playlist_id;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 3. Attach the Triggers to the table
    await queryRunner.query(`
      CREATE TRIGGER trigger_increment_reposts
      AFTER INSERT ON playlist_reposts
      FOR EACH ROW EXECUTE FUNCTION increment_playlist_reposts();
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_decrement_reposts
      AFTER DELETE ON playlist_reposts
      FOR EACH ROW EXECUTE FUNCTION decrement_playlist_reposts();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS playlist_reposts CASCADE;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS increment_playlist_reposts;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS decrement_playlist_reposts;`);
  }
}
