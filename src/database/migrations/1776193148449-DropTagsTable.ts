import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropTagsTable1776193148449 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS tags CASCADE;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE tags (
                tag_id    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                name      VARCHAR(100) UNIQUE NOT NULL,
                created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
            );
        `);
  }
}
