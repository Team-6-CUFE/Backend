import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Chat } from './chat.entity';
import { User } from '../../user/entities/user.entity';
import { Message } from './message.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('chat_status')
export class ChatStatus extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'chat_id' })
  chatId!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'last_read_message_id', type: 'uuid', nullable: true })
  lastReadMessageId!: string | null;

  @Column({ name: 'last_read_at', type: 'timestamptz', nullable: true })
  lastReadAt!: Date | null;

  @Column({ name: 'is_read', default: false })
  isRead!: boolean;

  @Column({ name: 'is_archived', default: false })
  isArchived!: boolean;

  @ManyToOne(() => Chat, (chat) => chat.statuses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat!: Chat;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Message, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'last_read_message_id' })
  lastReadMessage!: Message | null;
}
