import { Entity, Column, ManyToOne, JoinColumn, Relation, PrimaryColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Track } from './track.entity';

@Entity('track_likes')
export class TrackLikes {
  @PrimaryColumn({ type: 'uuid' })
  user_id!: string;

  @PrimaryColumn({ type: 'uuid' })
  track_id!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @ManyToOne(() => User, (user) => user.trackLikes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;

  @ManyToOne(() => Track, (track) => track.likes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track!: Relation<Track>;
}
