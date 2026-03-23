import { MigrationInterface, QueryRunner } from 'typeorm';

export class Addtypetoemailverificationtokens1773847296016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add type column to email_verification_tokens table
    await queryRunner.query(`
      ALTER TABLE email_verification_tokens
      ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'email_verification'
      CONSTRAINT chk_token_type CHECK (type IN ('email_verification', 'password_reset'));
    `);

    // Add index for type lookup
    await queryRunner.query(`
      CREATE INDEX idx_email_verification_tokens_type
      ON email_verification_tokens(type);
    `);

    // Add composite index for user + type lookup
    await queryRunner.query(`
      CREATE INDEX idx_email_verification_tokens_user_type
      ON email_verification_tokens(user_id, type);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_email_verification_tokens_user_type;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_email_verification_tokens_type;
    `);

    // Drop type column
    await queryRunner.query(`
      ALTER TABLE email_verification_tokens
      DROP COLUMN IF EXISTS type;
    `);
  }
}
