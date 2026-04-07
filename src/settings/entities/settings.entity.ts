import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum DeviceMessagePreference {
  EVERYONE = 'everyone',
  FOLLOWED = 'followed',
  OFF = 'off',
}

@Entity('settings')
export class Settings {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'show_my_activities', type: 'boolean', default: true })
  showMyActivities: boolean = true;

  @Column({ name: 'allow_messages_from_anyone', type: 'boolean', default: true })
  allowMessagesFromAnyone: boolean = true;

  @Column({ name: 'show_when_top_or_first_fan', type: 'boolean', default: true })
  showWhenTopOrFirstFan: boolean = true;

  @Column({ name: 'show_my_track_top_and_first_fans', type: 'boolean', default: true })
  showMyTrackTopAndFirstFans: boolean = true;

  @Column({ name: 'email_new_follower', type: 'boolean', default: true })
  emailNewFollower: boolean = false;

  @Column({ name: 'email_repost', type: 'boolean', default: true })
  emailRepost: boolean = true;

  @Column({ name: 'email_new_post', type: 'boolean', default: true })
  emailNewPost: boolean = true;

  @Column({ name: 'email_likes_plays', type: 'boolean', default: true })
  emailLikesPlays: boolean = false;

  @Column({ name: 'email_comment', type: 'boolean', default: true })
  emailComment: boolean = false;

  @Column({ name: 'email_recommended', type: 'boolean', default: true })
  emailRecommended: boolean = true;

  @Column({ name: 'email_new_message', type: 'boolean', default: true })
  emailNewMessage: boolean = true;

  @Column({ name: 'device_new_follower', type: 'boolean', default: true })
  deviceNewFollower: boolean = true;

  @Column({ name: 'device_repost', type: 'boolean', default: true })
  deviceRepost: boolean = true;

  @Column({ name: 'device_new_post', type: 'boolean', default: true })
  deviceNewPost: boolean = true;

  @Column({ name: 'device_likes_plays', type: 'boolean', default: true })
  deviceLikesPlays: boolean = true;

  @Column({ name: 'device_comment', type: 'boolean', default: true })
  deviceComment: boolean = true;

  @Column({ name: 'device_recommended', type: 'boolean', default: true })
  deviceRecommended: boolean = true;

  @Column({
    name: 'device_new_message',
    type: 'enum',
    enum: DeviceMessagePreference,
    default: DeviceMessagePreference.EVERYONE,
  })
  deviceNewMessage!: DeviceMessagePreference;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relationships
  @OneToOne(() => User, (user) => user.settings)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
