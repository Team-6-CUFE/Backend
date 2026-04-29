import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeOfflineListeningDefaultValue1777414513444 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "tracks" 
            ALTER COLUMN "offline_listening" SET DEFAULT true
        `);

    await queryRunner.query(`
            UPDATE "tracks" 
            SET "offline_listening" = true
            WHERE "offline_listening" = false
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "tracks" 
            ALTER COLUMN "offline_listening" SET DEFAULT false
        `);

    await queryRunner.query(`
            UPDATE "tracks" 
            SET "offline_listening" = false
            WHERE "offline_listening" = true
        `);
  }
}
