import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailVerificationCodesTable1773368421892 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE email_verification_codes (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        code       VARCHAR(6)  NOT NULL,
        email      VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP   NOT NULL,
        created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
      );
    `);

    // Index for fast code lookup (most common query)
    await queryRunner.query(`
      CREATE INDEX idx_email_verification_codes_code 
      ON email_verification_codes(code);
    `);

    // Index for user lookup
    await queryRunner.query(`
      CREATE INDEX idx_email_verification_codes_user
      ON email_verification_codes(user_id);
    `);

    // Index for email lookup
    await queryRunner.query(`
      CREATE INDEX idx_email_verification_codes_email
      ON email_verification_codes(email);
    `);

    // Index for cleanup job — easily find and delete expired codes
    await queryRunner.query(`
      CREATE INDEX idx_email_verification_codes_expires 
      ON email_verification_codes(expires_at);
    `);

    // Apply updated_at trigger
    await queryRunner.query(`
      CREATE TRIGGER update_email_verification_codes_updated_at
      BEFORE UPDATE ON email_verification_codes
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger first
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_email_verification_codes_updated_at 
      ON email_verification_codes;
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS email_verification_codes CASCADE;`);
  }
}
