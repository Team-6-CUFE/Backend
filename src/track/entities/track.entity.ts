import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Relation,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { TrackLikes } from './track-likes.entity';
import { TrackComment } from './track-comments.entity';
import { TrackRepost } from './track-reposts.entity';

export enum TrackStatus {
  PROCESSING = 'processing',
  FINISHED = 'finished',
  FAILED = 'failed',
}

@Entity('tracks')
export class Track extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  track_id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'varchar', length: 500 })
  audio_url!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cover_image!: string;

  @Column({ type: 'int', default: 0 })
  duration_seconds!: number;

  @Column({ type: 'boolean', default: true })
  is_public!: boolean;

  @Column({ type: 'boolean', default: false })
  hidden!: boolean;

  @Column({ type: 'enum', enum: TrackStatus, default: TrackStatus.PROCESSING })
  track_status!: TrackStatus;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  blocked_regions!: string[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  preview_audio_url!: string;

  @Column({ type: 'varchar', length: 500 })
  waveform_url!: string;

  @Column({ type: 'int', default: 0 })
  play_count!: number;

  @Column({ type: 'int', default: 0 })
  likes_count!: number;

  @Column({ type: 'int', default: 0 })
  reposts_count!: number;

  @Column({ type: 'int', default: 0 })
  comments_count!: number;

  @ManyToOne(() => User, (user) => user.tracks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;

  @OneToMany(() => TrackLikes, (trackLikes) => trackLikes.track)
  likes!: TrackLikes[];

  @OneToMany(() => TrackComment, (comment) => comment.track)
  comments!: TrackComment[];

  @OneToMany(() => TrackRepost, (repost) => repost.track)
  reposts!: TrackRepost[];
}
