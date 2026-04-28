import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { DownloadStatus } from '../enums/download-status.enum';
import { User } from '../../user/entities/user.entity';
import { Playlist } from '../../playlist/entities/playlist.entity';

@Entity('downloaded_playlists')
export class DownloadedPlaylist {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ name: 'playlist_id', type: 'uuid' })
  playlistId!: string;

  @Column({ name: 'downloaded_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  downloadedAt!: Date;

  @Column({ name: 'status', type: 'enum', enum: DownloadStatus, default: DownloadStatus.PENDING })
  status!: DownloadStatus;

  // --- Relations ---

  @ManyToOne(() => User, (user) => user.downloadedPlaylists, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Playlist, (playlist) => playlist.downloads, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlist_id' })
  playlist!: Playlist;
}
