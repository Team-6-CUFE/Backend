import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Relation,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Track } from './track.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('track_comments')
export class TrackComment extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'comment_id' })
  commentId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'track_id', type: 'uuid' })
  trackId!: string;

  @Column('text')
  content!: string;

  @Column({ name: 'timestamp_seconds', type: 'int', default: 0 })
  timestampSeconds!: number;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true, default: null })
  parentId!: string | null;

  @ManyToOne(() => User, (user) => user.trackComments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;

  @ManyToOne(() => Track, (track) => track.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track!: Relation<Track>;

  @ManyToOne(() => TrackComment, (comment) => comment.replies, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_id' })
  parent!: Relation<TrackComment> | null;

  @OneToMany(() => TrackComment, (comment) => comment.parent)
  replies!: Relation<TrackComment[]>;
}
