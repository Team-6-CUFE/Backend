import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  Relation,
  CreateDateColumn,
} from 'typeorm';
import type { Track } from '../../track/entities/track.entity';
import type { Playlist } from './playlist.entity';

@Entity('playlist_tracks')
export class PlaylistTrack {
  @PrimaryColumn({ type: 'uuid', name: 'playlist_id' })
  playlistId!: string;

  @PrimaryColumn({ type: 'uuid', name: 'track_id' })
  trackId!: string;

  @Column({ type: 'integer', name: 'position' })
  position!: number;

  @CreateDateColumn({ type: 'timestamp', name: 'added_at' })
  addedAt!: Date;

  // Relationships
  @ManyToOne('Playlist', 'playlistTracks', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlist_id' })
  playlist!: Relation<Playlist>;

  @ManyToOne('Track', 'trackPlaylists', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track!: Relation<Track>;
}
