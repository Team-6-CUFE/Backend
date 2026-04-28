import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUniqueDownloads11777415551196 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "downloaded_tracks" 
            DROP CONSTRAINT "downloaded_tracks_user_id_track_id_source_key"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "downloaded_tracks" 
            ADD CONSTRAINT "downloaded_tracks_user_id_track_id_source_key" 
            UNIQUE (user_id, track_id, source)
        `);
  }
}
