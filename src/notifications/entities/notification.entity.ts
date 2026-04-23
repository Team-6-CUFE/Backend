import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum NotificationType {
  NEW_FOLLOWER = 'new_follower',
  NEW_LIKE = 'new_like',
  NEW_REPOST = 'new_repost',
  NEW_COMMENT = 'new_comment',
  NEW_POST = 'new_post',
  MESSAGE = 'message',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid', { name: 'notification_id' })
  notificationId!: string;

  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @Column({ name: 'recipient_id', type: 'uuid' })
  recipientId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient!: User;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actor_id' })
  actor!: User;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead!: boolean;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at',
  })
  createdAt!: Date;

  track: any;

  playlist: any;

  message: any;
}
