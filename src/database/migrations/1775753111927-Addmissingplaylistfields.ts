import { MigrationInterface, QueryRunner } from 'typeorm';

export class Addmissingplaylistfields1775753111927 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create the ENUM type for playlist_type
    await queryRunner.query(`
            CREATE TYPE "playlists_type_enum" AS ENUM('Playlist', 'Album', 'EP', 'Single', 'Compilation')
        `);

    // 2. Add the new columns
    await queryRunner.query(`
            ALTER TABLE "playlists" 
            ADD COLUMN "buy_link" varchar(255) NULL,
            ADD COLUMN "record_label" varchar(255) NULL,
            ADD COLUMN "type" "playlists_type_enum" NOT NULL DEFAULT 'Playlist',
            ADD COLUMN "release_date" DATE NOT NULL DEFAULT CURRENT_DATE,
            ADD COLUMN "permalink" varchar(255) UNIQUE NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns
    await queryRunner.query(`
            ALTER TABLE "playlists" 
            DROP COLUMN "permalink",
            DROP COLUMN "release_date",
            DROP COLUMN "type",
            DROP COLUMN "record_label",
            DROP COLUMN "buy_link"
        `);

    // Drop the ENUM type
    await queryRunner.query(`DROP TYPE "playlists_type_enum"`);
  }
}
