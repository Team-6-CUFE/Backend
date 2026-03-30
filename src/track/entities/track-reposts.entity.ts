import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Track } from './track.entity';

@Entity('track_reposts')
export class TrackRepost {
  @PrimaryColumn('uuid')
  user_id!: string;

  @PrimaryColumn('uuid')
  track_id!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  caption!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @ManyToOne(() => User, (user) => user.trackReposts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;

  @ManyToOne(() => Track, (track) => track.reposts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track!: Relation<Track>;
}
