import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlaylistTracksTable1774981110875 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create the table
    await queryRunner.query(`
            CREATE TABLE playlist_tracks (
                playlist_id UUID NOT NULL REFERENCES playlists(playlist_id) ON DELETE CASCADE,
                track_id    UUID NOT NULL REFERENCES tracks(track_id) ON DELETE CASCADE,
                position    INTEGER NOT NULL,
                added_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (playlist_id, track_id)
            );
        `);

    // Index to quickly find all tracks in a specific playlist ordered by position
    await queryRunner.query(
      `CREATE INDEX idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);`
    );

    // 2. Create the Trigger Functions
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION increment_playlist_tracks()
            RETURNS TRIGGER AS $$
            BEGIN
                UPDATE playlists SET tracks_count = tracks_count + 1 WHERE playlist_id = NEW.playlist_id;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION decrement_playlist_tracks()
            RETURNS TRIGGER AS $$
            BEGIN
                UPDATE playlists SET tracks_count = tracks_count - 1 WHERE playlist_id = OLD.playlist_id;
                RETURN OLD;
            END;
            $$ LANGUAGE plpgsql;
        `);

    // 3. Attach the Triggers to the table
    await queryRunner.query(`
            CREATE TRIGGER trigger_increment_tracks
            AFTER INSERT ON playlist_tracks
            FOR EACH ROW EXECUTE FUNCTION increment_playlist_tracks();
        `);

    await queryRunner.query(`
            CREATE TRIGGER trigger_decrement_tracks
            AFTER DELETE ON playlist_tracks
            FOR EACH ROW EXECUTE FUNCTION decrement_playlist_tracks();
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cascading the table drop will remove the triggers attached to it
    await queryRunner.query(`DROP TABLE IF EXISTS playlist_tracks CASCADE;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS increment_playlist_tracks CASCADE;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS decrement_playlist_tracks CASCADE;`);
  }
}
