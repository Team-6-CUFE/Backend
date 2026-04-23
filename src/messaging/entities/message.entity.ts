import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Chat } from './chat.entity';
import { User } from '../../user/entities/user.entity';
import { MessageType } from '../enums/message-type.enum';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('messages')
export class Message extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'message_id' })
  messageId!: string;

  @Column({ name: 'chat_id' })
  chatId!: string;

  @Column({ name: 'sender_id' })
  senderId!: string;

  @Column({
    name: 'message_type',
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  messageType!: MessageType;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ name: 'shared_track_id', type: 'uuid', nullable: true })
  sharedTrackId!: string | null;

  @Column({ name: 'shared_playlist_id', type: 'uuid', nullable: true })
  sharedPlaylistId!: string | null;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => Chat, (chat) => chat.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat!: Chat;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender!: User;
}
