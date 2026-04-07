import { Entity, Column, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { Track } from './track.entity';
import { User } from '../../user/entities/user.entity';

@Entity('track_first_fans')
export class TrackFirstFan {
  @Column({ name: 'track_id', type: 'uuid', primary: true })
  trackId!: string;

  @Column({ name: 'user_id', type: 'uuid', primary: true })
  userId!: string;

  @Column({ name: 'play_count', type: 'int', default: 0 })
  playCount!: number;

  @ManyToOne(() => Track, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track!: Relation<Track>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;
}
