import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropTrackGenreTable1775577500375 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS track_genres CASCADE;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE track_genres (
            id SERIAL PRIMARY KEY,
            track_id UUID NOT NULL,
            genre_id UUID NOT NULL,
            UNIQUE(track_id, genre_id)
        );`);
  }
}
