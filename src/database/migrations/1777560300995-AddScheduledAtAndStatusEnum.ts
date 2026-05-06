import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScheduledAtAndStatusEnum1777560300995 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new enum value to track_status type
    await queryRunner.query(`ALTER TYPE "track_status_enum" ADD VALUE IF NOT EXISTS 'scheduled'`);

    // Add scheduled_at column
    await queryRunner.query(`
            ALTER TABLE "tracks"
            ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMPTZ NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove scheduled_at column
    await queryRunner.query(`ALTER TABLE "tracks" DROP COLUMN IF EXISTS "scheduled_at"`);

    // Note: PostgreSQL does not support removing enum values without recreating the type.
    // To fully revert the enum, recreate it without 'scheduled' and update the column.
    await queryRunner.query(`
            ALTER TABLE "tracks"
            ALTER COLUMN "track_status" TYPE VARCHAR(50)
        `);
    await queryRunner.query(`DROP TYPE IF EXISTS "track_status_enum"`);
    await queryRunner.query(`
            CREATE TYPE "track_status_enum" AS ENUM ('processing', 'finished', 'failed')
        `);
    await queryRunner.query(`
            ALTER TABLE "tracks"
            ALTER COLUMN "track_status" TYPE "track_status_enum"
            USING "track_status"::"track_status_enum"
        `);
  }
}
