import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Message } from './message.entity';
import { ChatStatus } from './chat-status.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('chats')
export class Chat extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'chat_id' })
  chatId!: string;

  @Column({ name: 'participant_one_id' })
  participantOneId!: string;

  @Column({ name: 'participant_two_id' })
  participantTwoId!: string;

  @Column({ name: 'last_message_id', nullable: true, type: 'uuid' })
  lastMessageId!: string | null;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_one_id' })
  participantOne!: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_two_id' })
  participantTwo!: User;

  @OneToOne(() => Message, { nullable: true })
  @JoinColumn({ name: 'last_message_id' })
  lastMessage!: Message | null;

  @OneToMany(() => Message, (message) => message.chat)
  messages!: Message[];

  @OneToMany(() => ChatStatus, (status) => status.chat)
  statuses!: ChatStatus[];
}
