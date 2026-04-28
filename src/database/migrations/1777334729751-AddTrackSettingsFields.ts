import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrackSettingsFields1777334729751 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tracks"
        ADD COLUMN "show_comments" boolean NOT NULL DEFAULT true,
        ADD COLUMN "allow_comments" boolean NOT NULL DEFAULT true,
        ADD COLUMN "show_insights" boolean NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tracks"
        DROP COLUMN "show_comments",
        DROP COLUMN "allow_comments",
        DROP COLUMN "show_insights";
    `);
  }
}
