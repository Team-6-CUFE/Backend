import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePendingOAuthTokens1773928363342 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE pending_oauth_tokens (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token      VARCHAR(255) NOT NULL UNIQUE,
        provider   VARCHAR(255) NOT NULL,
        provider_id VARCHAR(255) NOT NULL,
        email      VARCHAR(255) NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name  VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP    NOT NULL,
        created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Index for fast token lookup (most common query)
    await queryRunner.query(`
      CREATE INDEX idx_pending_oauth_tokens_token 
      ON pending_oauth_tokens(token);
    `);

    // Index for cleanup job — easily find and delete expired tokens
    await queryRunner.query(`
      CREATE INDEX idx_pending_oauth_tokens_expires 
      ON pending_oauth_tokens(expires_at);
    `);

    // Apply updated_at trigger
    await queryRunner.query(`
      CREATE TRIGGER update_pending_oauth_tokens_updated_at
      BEFORE UPDATE ON pending_oauth_tokens
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger first
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_pending_oauth_tokens_updated_at
      ON pending_oauth_tokens;
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS pending_oauth_tokens CASCADE;`);
  }
}
