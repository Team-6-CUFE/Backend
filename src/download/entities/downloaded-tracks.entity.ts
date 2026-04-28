import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Track } from '../../track/entities/track.entity';
import { Playlist } from '../../playlist/entities/playlist.entity';
import { DownloadStatus } from '../enums/download-status.enum';

export enum DownloadSource {
  TRACK = 'track',
  PLAYLIST = 'playlist',
}

@Entity('downloaded_tracks')
export class DownloadedTrack {
  @PrimaryGeneratedColumn('uuid', { name: 'download_id' })
  downloadId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'track_id', type: 'uuid' })
  trackId!: string;

  @Column({ name: 'source_playlist_id', type: 'uuid', nullable: true })
  sourcePlaylistId!: string | null;

  @Column({ name: 'downloaded_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  downloadedAt!: Date;

  @Column({ name: 'status', type: 'enum', enum: DownloadStatus, default: DownloadStatus.PENDING })
  status!: DownloadStatus;

  @Column({ name: 'source', type: 'enum', enum: DownloadSource, default: DownloadSource.TRACK })
  source!: DownloadSource;

  @ManyToOne(() => User, (user) => user.downloadedTracks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Track, (track) => track.downloads, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track!: Track;

  @ManyToOne(() => Playlist, (playlist) => playlist.trackDownloads, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'source_playlist_id' })
  sourcePlaylist!: Playlist | null;
}
