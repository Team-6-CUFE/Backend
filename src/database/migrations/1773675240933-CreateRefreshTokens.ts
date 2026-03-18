import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshTokens1773675240933 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        token      TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP    NOT NULL
      );
    `);

    // Index for fast token lookup (most common query)
    await queryRunner.query(`
      CREATE INDEX idx_refresh_tokens_token 
      ON refresh_tokens(token);
    `);

    // Index for cleanup job — easily find and delete expired tokens
    await queryRunner.query(`
      CREATE INDEX idx_refresh_tokens_expires 
      ON refresh_tokens(expires_at);
    `);

    await queryRunner.query(`
        CREATE OR REPLACE FUNCTION expire_refresh_tokens_delete_old_rows() RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
        DELETE FROM refresh_tokens WHERE expires_at < NOW();
        RETURN NEW;
        END;
        $$;
    `);

    await queryRunner.query(`
        CREATE TRIGGER expire_refresh_tokens_delete_old_rows_trigger
        AFTER INSERT ON refresh_tokens
        EXECUTE PROCEDURE expire_refresh_tokens_delete_old_rows();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TRIGGER IF EXISTS expire_refresh_tokens_delete_old_rows_trigger 
            ON refresh_tokens;
        `);

    await queryRunner.query(`
            DROP FUNCTION IF EXISTS expire_refresh_tokens_delete_old_rows;
        `);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens CASCADE;`);
  }
}
