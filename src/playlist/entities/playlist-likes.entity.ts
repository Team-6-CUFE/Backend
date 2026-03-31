import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn, Relation } from 'typeorm';
import type { User } from '../../user/entities/user.entity';
import type { Playlist } from './playlist.entity';

@Entity('playlist_likes')
export class PlaylistLike {
  @PrimaryColumn({ type: 'uuid', name: 'playlist_id' })
  playlistId!: string;

  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'timestamp', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  // Relationship
  @ManyToOne('Playlist', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlist_id' })
  playlist!: Relation<Playlist>;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;
}
