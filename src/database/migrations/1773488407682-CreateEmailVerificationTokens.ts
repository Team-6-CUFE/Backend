import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailVerificationTokensTable1773368421891 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE email_verification_tokens (
          id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id    UUID         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
          token      VARCHAR(255) NOT NULL UNIQUE,
          email      VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP    NOT NULL,
          created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
        );
      `);

    // Index for fast token lookup (most common query)
    await queryRunner.query(`
        CREATE INDEX idx_email_verification_tokens_token 
        ON email_verification_tokens(token);
      `);

    // Index for user lookup (e.g. check if user has a pending token)
    await queryRunner.query(`
        CREATE INDEX idx_email_verification_tokens_user 
        ON email_verification_tokens(user_id);
      `);

    // Index for email lookup
    await queryRunner.query(`
        CREATE INDEX idx_email_verification_tokens_email 
        ON email_verification_tokens(email);
      `);

    // Index for cleanup job — easily find and delete expired tokens
    await queryRunner.query(`
        CREATE INDEX idx_email_verification_tokens_expires 
        ON email_verification_tokens(expires_at);
      `);

    // Apply updated_at trigger
    await queryRunner.query(`
        CREATE TRIGGER update_email_verification_tokens_updated_at
        BEFORE UPDATE ON email_verification_tokens
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger first
    await queryRunner.query(`
        DROP TRIGGER IF EXISTS update_email_verification_tokens_updated_at 
        ON email_verification_tokens;
      `);

    await queryRunner.query(`DROP TABLE IF EXISTS email_verification_tokens CASCADE;`);
  }
}
