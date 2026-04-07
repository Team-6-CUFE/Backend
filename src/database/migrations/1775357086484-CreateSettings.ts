import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSettings1775357086484 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for device_new_message
    await queryRunner.query(`
      CREATE TYPE device_message_preference AS ENUM ('everyone', 'followed', 'off');
    `);

    // Settings table
    await queryRunner.query(`
      CREATE TABLE settings (
        user_id                         UUID         PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
        show_my_activities              BOOLEAN      NOT NULL DEFAULT true,
        allow_messages_from_anyone      BOOLEAN      NOT NULL DEFAULT true,
        show_when_top_or_first_fan      BOOLEAN      NOT NULL DEFAULT true,
        show_my_track_top_and_first_fans BOOLEAN     NOT NULL DEFAULT true,
        email_new_follower              BOOLEAN      NOT NULL DEFAULT false,
        email_repost                    BOOLEAN      NOT NULL DEFAULT true,
        email_new_post                  BOOLEAN      NOT NULL DEFAULT true,
        email_likes_plays               BOOLEAN      NOT NULL DEFAULT false,
        email_comment                   BOOLEAN      NOT NULL DEFAULT false,
        email_recommended               BOOLEAN      NOT NULL DEFAULT true,
        email_new_message               BOOLEAN      NOT NULL DEFAULT true,
        device_new_follower             BOOLEAN      NOT NULL DEFAULT true,
        device_repost                   BOOLEAN      NOT NULL DEFAULT true,
        device_new_post                 BOOLEAN      NOT NULL DEFAULT true,
        device_likes_plays              BOOLEAN      NOT NULL DEFAULT true,
        device_comment                  BOOLEAN      NOT NULL DEFAULT true,
        device_recommended              BOOLEAN      NOT NULL DEFAULT true,
        device_new_message              device_message_preference NOT NULL DEFAULT 'everyone',
        created_at                      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at                      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create index on user_id for faster lookups
    await queryRunner.query(`
      CREATE INDEX idx_settings_user_id ON settings(user_id);
    `);

    // Create trigger to automatically update updated_at timestamp
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_settings_updated_at
        BEFORE UPDATE ON settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column();`);
    await queryRunner.query(`DROP TABLE IF EXISTS settings CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS device_message_preference;`);
  }
}
