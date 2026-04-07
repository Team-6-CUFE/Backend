import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Relation,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { TrackLikes } from './track-likes.entity';
import { TrackComment } from './track-comments.entity';
import { TrackRepost } from './track-reposts.entity';
import { TrackStatus } from '../enums/track-status.enum';
import { TrackVisibility } from '../enums/track-visibility.enum';
import { Genre } from '../../genre/entities/genre.entity';
import { Tag } from './tag.entity';

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

  @Column({ name: 'audio_url', type: 'varchar', length: 500, nullable: true })
  audioUrl!: string;

  @Column({ name: 'audio_url_hq', type: 'varchar', length: 500, nullable: true })
  audioUrlHq!: string;

  @Column({ name: 'cover_image', type: 'varchar', length: 500, nullable: true })
  coverImage!: string;

  @Column({ name: 'duration_seconds', type: 'int', default: 0 })
  durationSeconds!: number;

  @Column({
    name: 'visibility',
    type: 'enum',
    enum: TrackVisibility,
    default: TrackVisibility.PUBLIC,
  })
  visibility!: TrackVisibility;

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

  @Column({ name: 'main_artists', type: 'text', array: true, nullable: true })
  mainArtists!: string[];

  @Column({ name: 'preview_audio_url', type: 'varchar', length: 500, nullable: true })
  previewAudioUrl!: string;

  @Column({
    name: 'preview_start_time',
    type: 'varchar',
    length: 20,
    nullable: true,
    default: '00:00:30',
  })
  previewStartTime!: string;

  @Column({ name: 'waveform_url', type: 'varchar', length: 500, nullable: true })
  waveformUrl!: string;

  @Column({ name: 'play_count', type: 'int', default: 0 })
  playCount!: number;

  @Column({ name: 'likes_count', type: 'int', default: 0 })
  likesCount!: number;

  @Column({ name: 'reposts_count', type: 'int', default: 0 })
  repostsCount!: number;

  @Column({ name: 'comments_count', type: 'int', default: 0 })
  commentsCount!: number;

  // Distribution metadata
  @Column({ name: 'buy_link', type: 'varchar', length: 500, nullable: true })
  buyLink!: string;

  @Column({ name: 'record_label', type: 'varchar', length: 255, nullable: true })
  recordLabel!: string;

  @Column({ name: 'release_date', type: 'date', nullable: true })
  releaseDate!: Date;

  @Column({ name: 'publisher', type: 'varchar', length: 255, nullable: true })
  publisher!: string;

  @Column({ name: 'isrc', type: 'varchar', length: 20, nullable: true })
  isrc!: string;

  @Column({ name: 'explicit_content', type: 'boolean', default: false })
  explicitContent!: boolean;

  @Column({ name: 'p_line', type: 'varchar', length: 500, nullable: true })
  pLine!: string;

  @Column({ name: 'track_link', type: 'varchar', length: 500, nullable: true })
  trackLink!: string;

  // Playback permissions
  @Column({ name: 'enable_direct_downloads', type: 'boolean', default: false })
  enableDirectDownloads!: boolean;

  @Column({ name: 'offline_listening', type: 'boolean', default: false })
  offlineListening!: boolean;

  // Licensing (Creative Commons style)
  @Column({ name: 'attribution', type: 'boolean', default: false })
  attribution!: boolean;

  @Column({ name: 'noncommercial', type: 'boolean', default: false })
  noncommercial!: boolean;

  @Column({ name: 'no_derivative_works', type: 'boolean', default: false })
  noDerivativeWorks!: boolean;

  @Column({ name: 'share_alike', type: 'boolean', default: false })
  shareAlike!: boolean;

  @ManyToOne(() => User, (user) => user.tracks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;

  @OneToMany(() => TrackLikes, (trackLikes) => trackLikes.track)
  likes!: TrackLikes[];

  @OneToMany(() => TrackComment, (comment) => comment.track)
  comments!: TrackComment[];

  @OneToMany(() => TrackRepost, (repost) => repost.track)
  reposts!: TrackRepost[];

  @ManyToMany(() => Genre)
  @JoinTable({
    name: 'track_genres',
    joinColumn: { name: 'track_id', referencedColumnName: 'trackId' },
    inverseJoinColumn: { name: 'genre_id', referencedColumnName: 'genreId' },
  })
  genres!: Genre[];

  @ManyToMany(() => Tag, (tag) => tag.tracks)
  @JoinTable({
    name: 'track_tags',
    joinColumn: { name: 'track_id', referencedColumnName: 'trackId' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'tagId' },
  })
  tags!: Tag[];
}
