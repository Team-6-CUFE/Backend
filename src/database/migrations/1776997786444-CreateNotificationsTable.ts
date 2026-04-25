import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsTable1776997786444 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0. CLEANUP: Drop the existing table and enum if they are already stuck in the DB
    await queryRunner.query(`DROP TABLE IF EXISTS notifications CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_type;`);

    // 1. Create the Enum for Notification Types
    await queryRunner.query(`
      CREATE TYPE notification_type AS ENUM (
        'new_follower',
        'new_like',
        'new_repost',
        'new_comment'
      );
    `);

    // 2. Create the Notifications Table
    await queryRunner.query(`
      CREATE TABLE notifications (
        notification_id UUID NOT NULL DEFAULT gen_random_uuid(),
        type            notification_type NOT NULL,
        recipient_id    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        actor_id        UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        is_read         BOOLEAN NOT NULL DEFAULT false,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (notification_id)
      );
    `);

    // 3. Create Indexes (Crucial for performance!)
    await queryRunner.query(`
      CREATE INDEX idx_notifications_recipient_unread 
      ON notifications(recipient_id) 
      WHERE is_read = false;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_notifications_recipient_created 
      ON notifications(recipient_id, created_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notifications_recipient_created;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notifications_recipient_unread;`);

    // Drop the table
    await queryRunner.query(`DROP TABLE IF EXISTS notifications CASCADE;`);

    // Drop the custom enum type
    await queryRunner.query(`DROP TYPE IF EXISTS notification_type;`);
  }
}
