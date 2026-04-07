import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGenreToTrack1775577524991 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tracks
        ADD COLUMN IF NOT EXISTS genre_id UUID REFERENCES genres(genre_id) ON DELETE SET NULL DEFAULT NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          ALTER TABLE tracks
            DROP COLUMN IF EXISTS genre_id
        `);
  }
}
