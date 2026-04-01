import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTracksCountToPlaylist1774981185620 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "playlists" ADD "tracks_count" integer NOT NULL DEFAULT 0`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "playlists" DROP COLUMN "tracks_count"`);
  }
}
