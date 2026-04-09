import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGenretoplaylist1775753125055 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`

      ALTER TABLE playlists

        ADD COLUMN IF NOT EXISTS genre_id UUID REFERENCES genres(genre_id) ON DELETE SET NULL DEFAULT NULL

        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`

          ALTER TABLE playlists

            DROP COLUMN IF EXISTS genre_id

        `);
  }
}
