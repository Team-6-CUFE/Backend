import { MigrationInterface, QueryRunner } from 'typeorm';

export class EditTagsToPointToGenresTable1776183270831 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS track_tags CASCADE;`);

    await queryRunner.query(`
            CREATE TABLE track_tags (
                track_id  UUID NOT NULL REFERENCES tracks(track_id) ON DELETE CASCADE,
                tag_id    UUID NOT NULL REFERENCES genres(genre_id)   ON DELETE CASCADE,
                PRIMARY KEY (track_id, tag_id)
            );
        `);

    await queryRunner.query(`
        CREATE INDEX idx_track_tags_track ON track_tags(track_id);
        `);

    await queryRunner.query(`
        CREATE INDEX idx_track_tags_tag ON track_tags(tag_id);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS track_tags CASCADE;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_track_tags_track;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_track_tags_tag;`);

    await queryRunner.query(`
            CREATE TABLE track_tags (
                track_id  UUID NOT NULL REFERENCES tracks(track_id) ON DELETE CASCADE,
                tag_id    UUID NOT NULL REFERENCES tags(tag_id)   ON DELETE CASCADE,
                PRIMARY KEY (track_id, tag_id)
            );
        `);

    await queryRunner.query(`
        CREATE INDEX idx_track_tags_track ON track_tags(track_id);
        `);

    await queryRunner.query(`
        CREATE INDEX idx_track_tags_tag ON track_tags(tag_id);
        `);
  }
}
