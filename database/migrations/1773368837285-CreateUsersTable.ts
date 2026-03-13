import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1773368321367 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE users (
        user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username      VARCHAR(50)  UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        first_name    VARCHAR(100),
        last_name     VARCHAR(100),
        display_name  VARCHAR(150),
        birthdate     DATE,
        gender        VARCHAR(20),
        bio           TEXT,
        avatar_url    VARCHAR(500),
        cover_photo   VARCHAR(500),
        country       VARCHAR(100),
        city          VARCHAR(100),
        role          VARCHAR(20)  DEFAULT 'listener' CHECK (role IN ('listener', 'artist', 'admin')),
        plan          VARCHAR(20)  DEFAULT 'free'     CHECK (plan IN ('free', 'pro', 'premium')),
        is_public         BOOLEAN  DEFAULT true,
        is_suspended      BOOLEAN  DEFAULT false,
        suspension_reason VARCHAR(500),
        support_link      VARCHAR(500),
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    //   - playlist_count   → COUNT(*) FROM playlists WHERE user_id = ?
    //   - track_count      → COUNT(*) FROM tracks WHERE user_id = ?
    //   - followers_count  → COUNT(*) FROM user_follows WHERE followed = ?
    //   - followings_count → COUNT(*) FROM user_follows WHERE follower = ?
    //   - reposts_count    → COUNT(*) FROM track_reposts WHERE user_id = ?
    //   - favorites_count  → COUNT(*) FROM track_likes WHERE user_id = ?

    // Create indexes for users table
    await queryRunner.query(`
      CREATE INDEX idx_users_username ON users(username);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_users_role ON users(role);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_users_created_at ON users(created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_users_is_suspended ON users(is_suspended) WHERE is_suspended = true;
    `);

    // Create user_emails table
    await queryRunner.query(`
      CREATE TABLE user_emails (
        email       VARCHAR(255) PRIMARY KEY UNIQUE NOT NULL,
        user_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        is_primary  BOOLEAN   DEFAULT false,
        is_verified BOOLEAN   DEFAULT false,
        verified_at TIMESTAMP,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure only one primary email per user
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_user_emails_primary 
      ON user_emails(user_id) 
      WHERE is_primary = true;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_user_emails_user ON user_emails(user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_user_emails_email ON user_emails(email);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_user_emails_verified ON user_emails(is_verified);
    `);

    // Create external_profiles table
    await queryRunner.query(`
      CREATE TABLE external_profiles (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        name       VARCHAR(50)  NOT NULL,
        url        VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_user_profile UNIQUE(user_id, name)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_external_profiles_user ON external_profiles(user_id);
    `);

    // Create social_accounts table
    await queryRunner.query(`
      CREATE TABLE social_accounts (
        provider_id    VARCHAR(255) PRIMARY KEY UNIQUE NOT NULL,
        user_id        UUID         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        provider       VARCHAR(20)  NOT NULL CHECK (provider IN ('google', 'facebook')),
        provider_email VARCHAR(255),
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_user_provider UNIQUE(user_id, provider)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_social_accounts_user ON social_accounts(user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_social_accounts_provider ON social_accounts(provider, provider_id);
    `);

    // Trigger function for updated_at (created once, reused across all tables)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Apply updated_at triggers
    await queryRunner.query(`
      CREATE TRIGGER update_users_updated_at 
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_user_emails_updated_at 
      BEFORE UPDATE ON user_emails
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_external_profiles_updated_at 
      BEFORE UPDATE ON external_profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_social_accounts_updated_at 
      BEFORE UPDATE ON social_accounts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_users_updated_at ON users;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_user_emails_updated_at ON user_emails;`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_external_profiles_updated_at ON external_profiles;`
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_social_accounts_updated_at ON social_accounts;`
    );

    await queryRunner.query(`DROP TABLE IF EXISTS social_accounts CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS external_profiles CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_emails CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE;`);

    // Drop trigger function last
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;`);
  }
}
