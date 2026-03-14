import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailVerificationCodesTable1773368421892 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create email_verification_codes table
    // Used for: short 6-digit codes sent in emails
    // Use cases: primary email change, 2FA (future)
    await queryRunner.query(`
      CREATE TABLE email_verification_codes (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        code       VARCHAR(6)  NOT NULL,
        attempts   INTEGER     DEFAULT 0,
        expires_at TIMESTAMP   NOT NULL,
        created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_attempts CHECK (attempts >= 0)
      );
    `);

    // Index for fast code lookup (most common query)
    await queryRunner.query(`
      CREATE INDEX idx_email_verification_codes_code 
      ON email_verification_codes(code);
    `);

    // Index for cleanup job — easily find and delete expired codes
    await queryRunner.query(`
      CREATE INDEX idx_email_verification_codes_expires 
      ON email_verification_codes(expires_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS email_verification_codes CASCADE;`);
  }
}
