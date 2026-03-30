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
import { TrackStatus } from '../enums/track-status.enum';

@Entity('tracks')
export class Track extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'track_id' })
  trackId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ name: 'audio_url', type: 'varchar', length: 500 })
  audioUrl!: string;

  @Column({ name: 'cover_image', type: 'varchar', length: 255, nullable: true })
  coverImage!: string;

  @Column({ name: 'duration_seconds', type: 'int', default: 0 })
  durationSeconds!: number;

  @Column({ name: 'is_public', type: 'boolean', default: true })
  isPublic!: boolean;

  @Column({ type: 'boolean', default: false })
  hidden!: boolean;

  @Column({
    name: 'track_status',
    type: 'enum',
    enum: TrackStatus,
    default: TrackStatus.PROCESSING,
  })
  trackStatus!: TrackStatus;

  @Column({ name: 'blocked_regions', type: 'text', array: true, default: () => "'{}'" })
  blockedRegions!: string[];

  @Column({ name: 'preview_audio_url', type: 'varchar', length: 500, nullable: true })
  previewAudioUrl!: string;

  @Column({ name: 'waveform_url', type: 'varchar', length: 500 })
  waveformUrl!: string;

  @Column({ name: 'play_count', type: 'int', default: 0 })
  playCount!: number;

  @Column({ name: 'likes_count', type: 'int', default: 0 })
  likesCount!: number;

  @Column({ name: 'reposts_count', type: 'int', default: 0 })
  repostsCount!: number;

  @Column({ name: 'comments_count', type: 'int', default: 0 })
  commentsCount!: number;

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
