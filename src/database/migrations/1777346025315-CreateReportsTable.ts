import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReportsTable1777346025315 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "report_type_enum" AS ENUM ('user', 'track', 'comment');
      CREATE TYPE "report_reason_enum" AS ENUM ('copyright', 'inappropriate', 'spam', 'harassment');
      CREATE TYPE "report_status_enum" AS ENUM ('pending', 'reviewed', 'resolved', 'rejected');

      CREATE TABLE "reports" (
        "report_id"    UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "reporter_id"  UUID          NOT NULL,
        "type"         "report_type_enum"    NOT NULL,
        "target_id"    UUID          NOT NULL,
        "reason"       "report_reason_enum"  NOT NULL,
        "description"  TEXT,
        "status"       "report_status_enum"  NOT NULL DEFAULT 'pending',
        "reviewed_at"  TIMESTAMP,
        "created_at"   TIMESTAMP     NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMP     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reports" PRIMARY KEY ("report_id")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "reports";
      DROP TYPE "report_status_enum";
      DROP TYPE "report_reason_enum";
      DROP TYPE "report_type_enum";
    `);
  }
}
