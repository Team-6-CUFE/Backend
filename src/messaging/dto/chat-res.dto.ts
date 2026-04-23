import { Expose, Exclude, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageResDto } from './message-res.dto';

@Exclude()
export class ChatResDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  chatId!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  participantOneId!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  participantTwoId!: string;

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z' })
  @Expose()
  updatedAt!: Date;

  @ApiProperty({ example: false })
  @Expose()
  isArchived!: boolean;

  @ApiProperty({ description: 'Unread message count for the current user', example: 3 })
  @Expose()
  unreadCount!: number;

  @ApiPropertyOptional({ type: () => MessageResDto })
  @Expose()
  @Type(() => MessageResDto)
  lastMessage?: MessageResDto | null;
}
