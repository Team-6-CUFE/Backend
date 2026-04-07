import { MigrationInterface, QueryRunner } from 'typeorm';

export class EditLastNameNullable1775530822347 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE pending_oauth_tokens
            ALTER COLUMN last_name DROP NOT NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE pending_oauth_tokens
            ALTER COLUMN last_name SET NOT NULL
        `);
  }
}
