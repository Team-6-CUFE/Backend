import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateActivitiesAddEnumAndTargetUser1776174918286 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create the enum type
    await queryRunner.query(`
      CREATE TYPE activity_type_enum AS ENUM (
        'track_like',
        'track_comment',
        'track_repost',
        'user_follow',
        'playlist_like',
        'playlist_repost',
        'track_posted',
        'playlist_posted'
      );
    `);

    // 2. Convert activity_type column from VARCHAR to enum
    await queryRunner.query(`
      ALTER TABLE activities
        ALTER COLUMN activity_type TYPE activity_type_enum
        USING activity_type::activity_type_enum;
    `);

    // 3. Add target_user_id (nullable because user_follow, track_posted, playlist_posted don't need it)
    await queryRunner.query(`
      ALTER TABLE activities
        ADD COLUMN target_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_activities_target_user ON activities(target_user_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse order
    await queryRunner.query(`DROP INDEX IF EXISTS idx_activities_target_user;`);

    await queryRunner.query(`
      ALTER TABLE activities DROP COLUMN IF EXISTS target_user_id;
    `);

    await queryRunner.query(`
      ALTER TABLE activities
        ALTER COLUMN activity_type TYPE VARCHAR(50)
        USING activity_type::TEXT;
    `);

    await queryRunner.query(`DROP TYPE IF EXISTS activity_type_enum;`);
  }
}
