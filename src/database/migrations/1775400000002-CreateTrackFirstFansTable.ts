import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTrackFirstFansTable1775400000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE track_first_fans (
        track_id    UUID  NOT NULL REFERENCES tracks(track_id) ON DELETE CASCADE,
        user_id     UUID  NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        play_count  INT   NOT NULL DEFAULT 0,
        PRIMARY KEY (track_id, user_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_track_first_fans_track_id
      ON track_first_fans(track_id, play_count DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_track_first_fans_track_id;`);
    await queryRunner.query(`DROP TABLE IF EXISTS track_first_fans CASCADE;`);
  }
}
