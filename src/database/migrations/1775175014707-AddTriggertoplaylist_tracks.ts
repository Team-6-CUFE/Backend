import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTriggertoplaylistTracks1775175014707 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create the ADD Function
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION fn_playlist_track_added()
            RETURNS TRIGGER AS $$
            BEGIN
                UPDATE playlists
                SET 
                    total_duration_seconds = total_duration_seconds + (SELECT duration_seconds FROM tracks WHERE track_id = NEW.track_id),
                WHERE playlist_id = NEW.playlist_id;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

    // 2. Create the REMOVE Function
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION fn_playlist_track_removed()
            RETURNS TRIGGER AS $$
            BEGIN
                UPDATE playlists
                SET 
                    total_duration_seconds = total_duration_seconds - (SELECT duration_seconds FROM tracks WHERE track_id = OLD.track_id),
                WHERE playlist_id = OLD.playlist_id;
                RETURN OLD;
            END;
            $$ LANGUAGE plpgsql;
        `);

    // 3. Create the INSERT Trigger
    await queryRunner.query(`
            CREATE TRIGGER trg_playlist_track_insert
            AFTER INSERT ON playlist_tracks
            FOR EACH ROW
            EXECUTE FUNCTION fn_playlist_track_added();
        `);

    // 4. Create the DELETE Trigger
    await queryRunner.query(`
            CREATE TRIGGER trg_playlist_track_delete
            AFTER DELETE ON playlist_tracks
            FOR EACH ROW
            EXECUTE FUNCTION fn_playlist_track_removed();
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop Triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_playlist_track_insert ON playlist_tracks;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_playlist_track_delete ON playlist_tracks;`);

    // Drop Functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_playlist_track_added();`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_playlist_track_removed();`);
  }
}
