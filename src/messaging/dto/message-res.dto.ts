import { Expose, Exclude } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from './ws/send-message.dto';

@Exclude()
export class MessageResDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  messageId!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  chatId!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  senderId!: string;

  @ApiProperty({ enum: MessageType, example: MessageType.TEXT })
  @Expose()
  messageType!: MessageType;

  @ApiPropertyOptional({ example: 'Hey, check out this track!' })
  @Expose()
  content?: string | null;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  sharedTrackId?: string | null;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  sharedPlaylistId?: string | null;

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z' })
  @Expose()
  createdAt!: Date;
}
