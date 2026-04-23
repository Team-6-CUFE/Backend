import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMessageTables1776627753982 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE message_type AS ENUM (
        'text',
        'track_share',
        'playlist_share'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE chats (
        chat_id             UUID        NOT NULL DEFAULT gen_random_uuid(),
        participant_one_id  UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        participant_two_id  UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        last_message_id     UUID        NULL,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at          TIMESTAMPTZ NULL,

        PRIMARY KEY (chat_id),


        CONSTRAINT chk_different_participants
          CHECK (participant_one_id <> participant_two_id)
      );
    `);
    await queryRunner.query(`
        CREATE UNIQUE INDEX uq_chat_participants
        ON chats (
            LEAST(participant_one_id::text, participant_two_id::text),
            GREATEST(participant_one_id::text, participant_two_id::text)
        );`);

    await queryRunner.query(`
      CREATE TABLE messages (
        message_id          UUID        NOT NULL DEFAULT gen_random_uuid(),
        chat_id             UUID        NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
        sender_id           UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        message_type        message_type NOT NULL DEFAULT 'text',
        content             TEXT        NULL,
        shared_track_id     UUID        NULL REFERENCES tracks(track_id) ON DELETE SET NULL,
        shared_playlist_id  UUID        NULL REFERENCES playlists(playlist_id) ON DELETE SET NULL,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at          TIMESTAMPTZ NULL,

        PRIMARY KEY (message_id),

        CONSTRAINT chk_message_has_content
          CHECK (
            content IS NOT NULL
            OR shared_track_id IS NOT NULL
            OR shared_playlist_id IS NOT NULL
          ),

        CONSTRAINT chk_track_share_has_track
          CHECK (message_type <> 'track_share' OR shared_track_id IS NOT NULL),

        CONSTRAINT chk_playlist_share_has_playlist
          CHECK (message_type <> 'playlist_share' OR shared_playlist_id IS NOT NULL)
      );
    `);

    // add the FK from chats.last_message_id
    await queryRunner.query(`
      ALTER TABLE chats
        ADD CONSTRAINT fk_chats_last_message
          FOREIGN KEY (last_message_id) REFERENCES messages(message_id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE chat_status (
        id                    UUID        NOT NULL DEFAULT gen_random_uuid(),
        chat_id               UUID        NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
        user_id               UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        is_read               BOOLEAN     NOT NULL DEFAULT false,
        last_read_message_id  UUID        NULL REFERENCES messages(message_id) ON DELETE SET NULL,
        last_read_at          TIMESTAMPTZ NULL,
        is_archived           BOOLEAN     NOT NULL DEFAULT false,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (id),

        CONSTRAINT uq_chat_status_per_user UNIQUE (chat_id, user_id)
      );
    `);

    // Inbox list query: all chats for a user, ordered by activity
    await queryRunner.query(`
      CREATE INDEX idx_chats_participant_one ON chats(participant_one_id)
        WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX idx_chats_participant_two ON chats(participant_two_id)
        WHERE deleted_at IS NULL;
    `);

    // Message history query: all messages in a chat, newest first
    await queryRunner.query(`
      CREATE INDEX idx_messages_chat_id_created ON messages(chat_id, created_at DESC)
        WHERE deleted_at IS NULL;
    `);

    // Sender lookup (admin / moderation use)
    await queryRunner.query(`
      CREATE INDEX idx_messages_sender_id ON messages(sender_id)
        WHERE deleted_at IS NULL;
    `);

    // Unread count query: chat_status rows for a user with unread messages
    await queryRunner.query(`
      CREATE INDEX idx_chat_status_user_id ON chat_status(user_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_chat_status_chat_user ON chat_status(chat_id, user_id);
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_chats_updated_at
        BEFORE UPDATE ON chats
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_messages_updated_at
        BEFORE UPDATE ON messages
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_chat_status_updated_at
        BEFORE UPDATE ON chat_status
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_chat_status_updated_at ON chat_status;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;`);

    // Indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_chat_status_chat_user;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_chat_status_user_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_messages_sender_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_messages_chat_id_created;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_chats_participant_two;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_chats_participant_one;`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_chat_participants;`);

    // Drop FK before dropping tables
    await queryRunner.query(`ALTER TABLE chats DROP CONSTRAINT IF EXISTS fk_chats_last_message;`);

    // Tables (order matters — chat_status and messages reference chats)
    await queryRunner.query(`DROP TABLE IF EXISTS chat_status CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS messages CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS chats CASCADE;`);

    // Enum
    await queryRunner.query(`DROP TYPE IF EXISTS message_type;`);
  }
}
