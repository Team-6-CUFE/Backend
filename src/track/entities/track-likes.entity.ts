import { Entity, Column, ManyToOne, JoinColumn, Relation, PrimaryColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Track } from './track.entity';

@Entity('track_likes')
export class TrackLikes {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ name: 'track_id', type: 'uuid' })
  trackId!: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @ManyToOne(() => User, (user) => user.trackLikes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;

  @ManyToOne(() => Track, (track) => track.likes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track!: Relation<Track>;
}
