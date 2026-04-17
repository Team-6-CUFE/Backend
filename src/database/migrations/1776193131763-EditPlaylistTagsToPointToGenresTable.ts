import { MigrationInterface, QueryRunner } from 'typeorm';

export class EditPlaylistTagsToPointToGenresTable1776193131763 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS playlist_tags CASCADE;`);

    await queryRunner.query(`
                CREATE TABLE playlist_tags (
                    playlist_id UUID NOT NULL REFERENCES playlists(playlist_id) ON DELETE CASCADE,
                    tag_id    UUID NOT NULL REFERENCES genres(genre_id)   ON DELETE CASCADE,
                    PRIMARY KEY (playlist_id, tag_id)
                );
            `);

    await queryRunner.query(`
            CREATE INDEX idx_playlist_tags_playlist ON playlist_tags(playlist_id);
            `);

    await queryRunner.query(`
            CREATE INDEX idx_playlist_tags_tag ON playlist_tags(tag_id);
            `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS playlist_tags CASCADE;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_playlist_tags_playlist;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_playlist_tags_tag;`);

    await queryRunner.query(`
                CREATE TABLE playlist_tags (
                    playlist_id UUID NOT NULL REFERENCES playlists(playlist_id) ON DELETE CASCADE,
                    tag_id      UUID NOT NULL REFERENCES tags(tag_id)   ON DELETE CASCADE,
                    PRIMARY KEY (playlist_id, tag_id)
                );
            `);

    await queryRunner.query(`
            CREATE INDEX idx_playlist_tags_playlist ON playlist_tags(playlist_id);
            `);

    await queryRunner.query(`
            CREATE INDEX idx_playlist_tags_tag ON playlist_tags(tag_id);
            `);
  }
}
