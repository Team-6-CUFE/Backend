import { Expose, Exclude, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtherUserDto } from './other-user.dto';
import { MessageResDto } from './message-res.dto';

@Exclude()
export class ChatResDto {
  @ApiProperty({
    description: 'UUID of the chat',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @Expose()
  chatId!: string;

  @ApiProperty({
    description: 'The other participant in this chat',
    type: () => OtherUserDto,
  })
  @Expose()
  @Type(() => OtherUserDto)
  otherUser!: OtherUserDto;

  @ApiProperty({
    description: 'Whether the authenticated user has archived this chat',
    example: false,
  })
  @Expose()
  isArchived!: boolean;

  @ApiProperty({
    description: 'Number of unread messages for the authenticated user in this chat',
    example: 3,
  })
  @Expose()
  unreadCount!: number;

  @ApiProperty({
    description: 'ISO timestamp of when the chat was created',
    example: '2025-01-15T10:30:00.000Z',
  })
  @Expose()
  createdAt!: Date;

  @ApiProperty({
    description: 'ISO timestamp of the last activity in the chat (updated on each new message)',
    example: '2025-01-15T10:30:00.000Z',
  })
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'Preview of the last message in the chat. Null if no messages have been sent yet',
    type: () => MessageResDto,
    nullable: true,
  })
  @Expose()
  @Type(() => MessageResDto)
  lastMessage?: MessageResDto | null;
}
