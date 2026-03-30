import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlaylistsTable1773368421893 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE playlists (
        playlist_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title         VARCHAR(255) NOT NULL,
        description   TEXT,
        cover_image   VARCHAR(255),
        is_public     BOOLEAN NOT NULL DEFAULT false,
        likes_count   INT NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
        reposts_count INT NOT NULL DEFAULT 0 CHECK (reposts_count >= 0),
        user_id       UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_playlists_user_id ON playlists(user_id);`);
    await queryRunner.query(`CREATE INDEX idx_playlists_is_public ON playlists(is_public);`);

    await queryRunner.query(`
      CREATE TRIGGER update_playlists_updated_at
      BEFORE UPDATE ON playlists
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_playlists_updated_at ON playlists;`);
    await queryRunner.query(`DROP TABLE IF EXISTS playlists CASCADE;`);
  }
}
