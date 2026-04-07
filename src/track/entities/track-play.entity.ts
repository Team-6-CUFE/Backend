import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { Track } from './track.entity';
import { User } from '../../user/entities/user.entity';
import { Playlist } from '../../playlist/entities/playlist.entity';

@Entity('track_plays')
export class TrackPlay {
  @PrimaryGeneratedColumn('uuid', { name: 'track_play_id' })
  trackPlayId!: string;

  @Column({ name: 'track_id', type: 'uuid' })
  trackId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'played_at', type: 'timestamptz', default: () => 'NOW()' })
  playedAt!: Date;

  @Column({ name: 'playlist_id', type: 'uuid', nullable: true })
  playlistId!: string | null;

  @ManyToOne(() => Track, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track!: Relation<Track>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;

  @ManyToOne(() => Playlist, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'playlist_id' })
  playlist!: Relation<Playlist> | null;
}
