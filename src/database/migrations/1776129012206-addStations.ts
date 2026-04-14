import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStations1776129012206 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add the column
    await queryRunner.query(
      `ALTER TABLE playlists ADD COLUMN IF NOT EXISTS track_id UUID REFERENCES tracks(track_id) ON DELETE SET NULL`
    );

    // 2. Handle Enum Swap
    await queryRunner.query(
      `CREATE TYPE "playlists_type_enum_new" AS ENUM('Playlist', 'Album', 'EP', 'Single', 'Compilation', 'Station')`
    );

    await queryRunner.query(`
            ALTER TABLE "playlists" 
            ALTER COLUMN "type" DROP DEFAULT,
            ALTER COLUMN "type" TYPE "playlists_type_enum_new" 
                USING "type"::text::"playlists_type_enum_new",
            ALTER COLUMN "type" SET DEFAULT 'Playlist'
        `);

    await queryRunner.query(`DROP TYPE "playlists_type_enum"`);
    await queryRunner.query(`ALTER TYPE "playlists_type_enum_new" RENAME TO "playlists_type_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Clean up 'Station' values first (or they will break the down migration)
    await queryRunner.query(`UPDATE "playlists" SET "type" = 'Playlist' WHERE "type" = 'Station'`);

    await queryRunner.query(`ALTER TABLE playlists DROP COLUMN IF EXISTS track_id`);

    await queryRunner.query(
      `CREATE TYPE "playlists_type_enum_old" AS ENUM('Playlist', 'Album', 'EP', 'Single', 'Compilation')`
    );

    await queryRunner.query(`
            ALTER TABLE "playlists" 
            ALTER COLUMN "type" DROP DEFAULT,
            ALTER COLUMN "type" TYPE "playlists_type_enum_old" 
                USING "type"::text::"playlists_type_enum_old",
            ALTER COLUMN "type" SET DEFAULT 'Playlist'
        `);

    await queryRunner.query(`DROP TYPE "playlists_type_enum"`);
    await queryRunner.query(`ALTER TYPE "playlists_type_enum_old" RENAME TO "playlists_type_enum"`);
  }
}
