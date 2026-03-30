import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserCounts1774899549520 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    //add missing columns
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS playlist_count   INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS track_count      INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS followers_count  INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS followings_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS reposts_count    INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS favorites_count  INTEGER DEFAULT 0;
    `);
    //non negative constraints
    await queryRunner.query(`
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_playlist_count_non_negative') THEN
        ALTER TABLE users ADD CONSTRAINT chk_playlist_count_non_negative CHECK (playlist_count >= 0);
        END IF;
    END $$;
    `);

    await queryRunner.query(`
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_track_count_non_negative') THEN
        ALTER TABLE users ADD CONSTRAINT chk_track_count_non_negative CHECK (track_count >= 0);
        END IF;
    END $$;
    `);

    await queryRunner.query(`
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_followers_count_non_negative') THEN
        ALTER TABLE users ADD CONSTRAINT chk_followers_count_non_negative CHECK (followers_count >= 0);
        END IF;
    END $$;
    `);

    await queryRunner.query(`
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_followings_count_non_negative') THEN
        ALTER TABLE users ADD CONSTRAINT chk_followings_count_non_negative CHECK (followings_count >= 0);
        END IF;
    END $$;
    `);

    await queryRunner.query(`
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_reposts_count_non_negative') THEN
        ALTER TABLE users ADD CONSTRAINT chk_reposts_count_non_negative CHECK (reposts_count >= 0);
        END IF;
    END $$;
    `);

    await queryRunner.query(`
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_favorites_count_non_negative') THEN
        ALTER TABLE users ADD CONSTRAINT chk_favorites_count_non_negative CHECK (favorites_count >= 0);
        END IF;
    END $$;
    `);

    //create triggers
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_user_playlist_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE users 
          SET playlist_count = playlist_count + 1 
          WHERE user_id = NEW.user_id;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE users 
          SET playlist_count = GREATEST(playlist_count - 1, 0)
          WHERE user_id = OLD.user_id;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_user_track_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE users 
          SET track_count = track_count + 1 
          WHERE user_id = NEW.user_id;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE users 
          SET track_count = GREATEST(track_count - 1, 0)
          WHERE user_id = OLD.user_id;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_user_follow_counts()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE users 
          SET followers_count = followers_count + 1 
          WHERE user_id = NEW.followed;

          UPDATE users 
          SET followings_count = followings_count + 1 
          WHERE user_id = NEW.follower;

        ELSIF TG_OP = 'DELETE' THEN
          UPDATE users 
          SET followers_count = GREATEST(followers_count - 1, 0)
          WHERE user_id = OLD.followed;

          UPDATE users 
          SET followings_count = GREATEST(followings_count - 1, 0)
          WHERE user_id = OLD.follower;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_user_reposts_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE users 
          SET reposts_count = reposts_count + 1 
          WHERE user_id = NEW.user_id;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE users 
          SET reposts_count = GREATEST(reposts_count - 1, 0)
          WHERE user_id = OLD.user_id;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_user_favorites_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE users 
          SET favorites_count = favorites_count + 1 
          WHERE user_id = NEW.user_id;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE users 
          SET favorites_count = GREATEST(favorites_count - 1, 0)
          WHERE user_id = OLD.user_id;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    //attach triggers
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_playlist_count'
        ) THEN
          CREATE TRIGGER trg_user_playlist_count
          AFTER INSERT OR DELETE ON playlists
          FOR EACH ROW EXECUTE FUNCTION update_user_playlist_count();
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_track_count'
        ) THEN
          CREATE TRIGGER trg_user_track_count
          AFTER INSERT OR DELETE ON tracks
          FOR EACH ROW EXECUTE FUNCTION update_user_track_count();
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_follow_count'
        ) THEN
          CREATE TRIGGER trg_user_follow_count
          AFTER INSERT OR DELETE ON user_follows
          FOR EACH ROW EXECUTE FUNCTION update_user_follow_counts();
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_reposts_count'
        ) THEN
          CREATE TRIGGER trg_user_reposts_count
          AFTER INSERT OR DELETE ON track_reposts
          FOR EACH ROW EXECUTE FUNCTION update_user_reposts_count();
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_favorites_count'
        ) THEN
          CREATE TRIGGER trg_user_favorites_count
          AFTER INSERT OR DELETE ON track_likes
          FOR EACH ROW EXECUTE FUNCTION update_user_favorites_count();
        END IF;
      END $$;
    `);

    //backfill
    await queryRunner.query(`
      UPDATE users u SET playlist_count = (
        SELECT COUNT(*) FROM playlists p WHERE p.user_id = u.user_id
      );
    `);

    await queryRunner.query(`
      UPDATE users u SET track_count = (
        SELECT COUNT(*) FROM tracks t WHERE t.user_id = u.user_id
      );
    `);

    await queryRunner.query(`
      UPDATE users u SET followers_count = (
        SELECT COUNT(*) FROM user_follows f WHERE f.followed = u.user_id
      );
    `);

    await queryRunner.query(`
      UPDATE users u SET followings_count = (
        SELECT COUNT(*) FROM user_follows f WHERE f.follower = u.user_id
      );
    `);

    await queryRunner.query(`
      UPDATE users u SET reposts_count = (
        SELECT COUNT(*) FROM track_reposts r WHERE r.user_id = u.user_id
      );
    `);

    await queryRunner.query(`
      UPDATE users u SET favorites_count = (
        SELECT COUNT(*) FROM track_likes l WHERE l.user_id = u.user_id
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_user_playlist_count ON playlists;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_user_track_count ON tracks;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_user_follow_count ON user_follows;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_user_reposts_count ON track_reposts;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_user_favorites_count ON track_likes;`);

    await queryRunner.query(`DROP FUNCTION IF EXISTS update_user_playlist_count;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_user_track_count;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_user_follow_counts;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_user_reposts_count;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_user_favorites_count;`);

    await queryRunner.query(
      `ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_playlist_count_non_negative;`
    );
    await queryRunner.query(
      `ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_track_count_non_negative;`
    );
    await queryRunner.query(
      `ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_followers_count_non_negative;`
    );
    await queryRunner.query(
      `ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_followings_count_non_negative;`
    );
    await queryRunner.query(
      `ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_reposts_count_non_negative;`
    );
    await queryRunner.query(
      `ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_favorites_count_non_negative;`
    );

    await queryRunner.query(`
    ALTER TABLE users
    DROP COLUMN IF EXISTS playlist_count,
    DROP COLUMN IF EXISTS track_count,
    DROP COLUMN IF EXISTS followers_count,
    DROP COLUMN IF EXISTS followings_count,
    DROP COLUMN IF EXISTS reposts_count,
    DROP COLUMN IF EXISTS favorites_count;
  `);
  }
}
