import { Entity, Column, ManyToOne, JoinColumn, Relation, PrimaryColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Track } from './track.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('track_comments')
export class TrackComment extends BaseEntity {
  @PrimaryColumn({ name: 'comment_id', type: 'uuid' })
  commentId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'track_id', type: 'uuid' })
  trackId!: string;

  @Column('text')
  content!: string;

  @Column({ name: 'timestamp_seconds', type: 'int', default: 0 })
  timestampSeconds!: number;

  @ManyToOne(() => User, (user) => user.trackComments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;

  @ManyToOne(() => Track, (track) => track.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track!: Relation<Track>;
}
