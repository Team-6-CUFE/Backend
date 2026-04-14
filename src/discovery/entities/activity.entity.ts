import { Entity, Column, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

export enum ActivityType {
  TRACK_LIKE = 'track_like',
  TRACK_COMMENT = 'track_comment',
  TRACK_REPOST = 'track_repost',
  USER_FOLLOW = 'user_follow',
  PLAYLIST_LIKE = 'playlist_like',
  PLAYLIST_REPOST = 'playlist_repost',
  TRACK_POSTED = 'track_posted',
  PLAYLIST_POSTED = 'playlist_posted',
}

@Entity('activities')
export class Activity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'activity_id' })
  activityId!: string;

  @Column({ name: 'activity_type', type: 'enum', enum: ActivityType })
  activityType!: ActivityType;

  // The target of the activity (e.g. track_id for track_like, user_id for user_follow)
  @Column({ name: 'target_id', type: 'uuid' })
  targetId!: string;

  // The actor — who performed the action
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  // The owner of the content being acted on (nullable for user_follow, track_posted, playlist_posted)
  @Column({ name: 'target_user_id', type: 'uuid', nullable: true })
  targetUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'target_user_id' })
  targetUser!: User | null;
}
