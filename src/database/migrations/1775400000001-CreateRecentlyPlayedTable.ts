import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRecentlyPlayedTable1775400000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE recently_played_item_type AS ENUM ('artist', 'playlist');
    `);

    await queryRunner.query(`
      CREATE TABLE recently_played (
        user_id     UUID                        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        item_id     UUID                        NOT NULL,
        item_type   recently_played_item_type   NOT NULL,
        played_at   TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, item_id, item_type)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_recently_played_user_played_at
      ON recently_played(user_id, played_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_recently_played_user_played_at;`);
    await queryRunner.query(`DROP TABLE IF EXISTS recently_played CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS recently_played_item_type;`);
  }
}
