import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTrackGenreTagTables1775184000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tags table
    await queryRunner.query(`
      CREATE TABLE tags (
        tag_id    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        name      VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_tags_name ON tags(name);
    `);

    // track_genres junction table
    await queryRunner.query(`
      CREATE TABLE track_genres (
        track_id  UUID NOT NULL REFERENCES tracks(track_id) ON DELETE CASCADE,
        genre_id  UUID NOT NULL REFERENCES genres(genre_id) ON DELETE CASCADE,
        PRIMARY KEY (track_id, genre_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_track_genres_track ON track_genres(track_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_track_genres_genre ON track_genres(genre_id);
    `);

    // track_tags junction table
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS track_tags CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS track_genres CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tags CASCADE;`);
  }
}
