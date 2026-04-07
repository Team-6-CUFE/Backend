import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSecretTokentoplaylist1775507660331 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the nullable secret_token column
    await queryRunner.query(`
            ALTER TABLE playlists 
            ADD COLUMN secret_token VARCHAR(255) UNIQUE;
        `);

    // Optional: Add an index if you plan to look up playlists directly by their token
    await queryRunner.query(`
            CREATE INDEX idx_playlists_secret_token 
            ON playlists(secret_token);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index first
    await queryRunner.query(`
            DROP INDEX IF EXISTS idx_playlists_secret_token;
        `);

    // Drop the column
    await queryRunner.query(`
            ALTER TABLE playlists 
            DROP COLUMN IF EXISTS secret_token;
        `);
  }
}
