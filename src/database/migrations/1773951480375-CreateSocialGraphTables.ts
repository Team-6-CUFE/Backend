import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSocialGraphTables1773951480375 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE user_follows (
        follower   UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        followed   UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (follower, followed)
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_user_follows_follower ON user_follows(follower);`);
    await queryRunner.query(`CREATE INDEX idx_user_follows_followed ON user_follows(followed);`);

    await queryRunner.query(`
      CREATE TABLE user_blocks (
        blocker    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        blocked    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (blocker, blocked)
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_user_blocks_blocker ON user_blocks(blocker);`);
    await queryRunner.query(`CREATE INDEX idx_user_blocks_blocked ON user_blocks(blocked);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_blocks CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_follows CASCADE;`);
  }
}
