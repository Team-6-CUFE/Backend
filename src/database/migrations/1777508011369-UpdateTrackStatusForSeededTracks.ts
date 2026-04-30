import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTrackStatusForSeededTracks1777508011369 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE "tracks" 
            SET "track_status" = 'finished'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE "tracks" 
            SET "track_status" = 'processing'
        `);
  }
}
