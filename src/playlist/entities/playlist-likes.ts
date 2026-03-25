import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Playlist } from './playlist.entity';

@Entity('playlist_likes')
export class PlaylistLike {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  playlist_id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  // Relationship
  @ManyToOne(() => Playlist, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlist_id' })
  playlist!: Relation<Playlist>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;
}
