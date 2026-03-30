import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn, Relation } from 'typeorm';
import type { User } from '../../user/entities/user.entity';
import type { Playlist } from './playlist.entity';

@Entity('playlist_reposts')
export class PlaylistRepost {
  // primary key is combination of playlist_id and user_id
  @PrimaryColumn({ type: 'uuid' })
  playlist_id!: string;

  @PrimaryColumn({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  // Relationship
  @ManyToOne('Playlist', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlist_id' })
  playlist!: Relation<Playlist>;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;
}
