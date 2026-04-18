import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum ActivityType {
  TRACK_LIKE = 'track_like',
  TRACK_COMMENT = 'track_comment',
  TRACK_REPOST = 'track_repost',
  USER_FOLLOW = 'user_follow',
  USER_FOLLOWS = 'user_follows', // Syncing this with your previous migration
  PLAYLIST_LIKE = 'playlist_like',
  PLAYLIST_REPOST = 'playlist_repost',
  TRACK_POSTED = 'track_posted',
  PLAYLIST_POSTED = 'playlist_posted',
}

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn('uuid', { name: 'activity_id' })
  activityId!: string;

  @Column({ name: 'activity_type', type: 'enum', enum: ActivityType })
  activityType!: ActivityType;

  @Column({ name: 'target_id', type: 'uuid' })
  targetId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'target_user_id', type: 'uuid', nullable: true })
  targetUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'target_user_id' })
  targetUser!: User | null;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at',
  })
  createdAt!: Date;
}
