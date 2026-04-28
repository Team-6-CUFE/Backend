import { MigrationInterface, QueryRunner } from 'typeorm';

export class DownloadsTables1777335813881 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE download_status_enum AS ENUM('pending', 'completed', 'failed')
        `);

    await queryRunner.query(`
            CREATE TYPE download_source_enum AS ENUM('track', 'playlist')
        `);

    await queryRunner.query(`
            CREATE TABLE downloaded_tracks (
                download_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                track_id UUID NOT NULL,
                downloaded_at TIMESTAMP DEFAULT NOW(),
                status download_status_enum DEFAULT 'pending',
                source download_source_enum DEFAULT 'track',
                source_playlist_id UUID,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (track_id) REFERENCES tracks(id),
                FOREIGN KEY (source_playlist_id) REFERENCES playlists(id),   
        `);
    await queryRunner.query(`
            CREATE TABLE downloaded_playlists (
                user_id UUID NOT NULL,
                playlist_id UUID NOT NULL,
                downloaded_at TIMESTAMP DEFAULT NOW(),
                status download_status_enum DEFAULT 'pending',
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (playlist_id) REFERENCES playlists(id),
                PRIMARY KEY (user_id, playlist_id)
            )
        `);

    // Create indexes for performance
    await queryRunner.query(`
            CREATE INDEX idx_downloads_user_id ON downloaded_tracks(user_id)
        `);

    await queryRunner.query(`
            CREATE INDEX idx_downloads_track_id ON downloaded_tracks(track_id)
        `);

    await queryRunner.query(`
            CREATE INDEX idx_downloads_source_playlist_id ON downloaded_tracks(source_playlist_id)
        `);

    await queryRunner.query(`
            CREATE INDEX idx_downloads_playlist_user_id ON downloaded_playlists(user_id)
        `);

    await queryRunner.query(`
            CREATE INDEX idx_downloads_playlist_id ON downloaded_playlists(playlist_id)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
            DROP INDEX idx_downloads_user_id
        `);
    await queryRunner.query(`
            DROP INDEX idx_downloads_track_id
        `);
    await queryRunner.query(`
            DROP INDEX idx_downloads_source_playlist_id
        `);
    await queryRunner.query(`
            DROP INDEX idx_downloads_playlist_user_id
        `);
    await queryRunner.query(`
            DROP INDEX idx_downloads_playlist_id
        `);

    // Drop tables
    await queryRunner.query(`
            DROP TABLE downloaded_tracks
        `);
    await queryRunner.query(`
            DROP TABLE downloaded_playlists
        `);
  }
}
