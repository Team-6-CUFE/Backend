import { Entity, Column, ManyToOne, JoinColumn, Relation, PrimaryColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Track } from './track.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('track_comments')
export class TrackComment extends BaseEntity {
  @PrimaryColumn('uuid')
  comment_id!: string;

  @Column('uuid')
  user_id!: string;

  @Column('uuid')
  track_id!: string;

  @Column('text')
  content!: string;

  @Column({ type: 'int', default: 0 })
  timestamp_seconds!: number;

  @ManyToOne(() => User, (user) => user.trackComments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;

  @ManyToOne(() => Track, (track) => track.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track!: Relation<Track>;
}
