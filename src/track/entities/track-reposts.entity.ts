import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Track } from './track.entity';

@Entity('track_reposts')
export class TrackRepost {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ name: 'track_id', type: 'uuid' })
  trackId!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  caption!: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @ManyToOne(() => User, (user) => user.trackReposts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;

  @ManyToOne(() => Track, (track) => track.reposts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track!: Relation<Track>;
}
