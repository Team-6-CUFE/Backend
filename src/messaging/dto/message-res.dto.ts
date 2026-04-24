import { Expose, Exclude } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from './ws/send-message.dto';

@Exclude()
export class MessageResDto {
  @ApiProperty({
    description: 'UUID of the message',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @Expose()
  messageId!: string;

  @ApiProperty({
    description: 'UUID of the chat this message belongs to',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @Expose()
  chatId!: string;

  @ApiProperty({
    description: 'UUID of the user who sent this message',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @Expose()
  senderId!: string;

  @ApiProperty({
    description: 'Type of the message — text, track share, or playlist share',
    enum: MessageType,
    example: MessageType.TEXT,
  })
  @Expose()
  messageType!: MessageType;

  @ApiPropertyOptional({
    description:
      'Text content of the message. Present for text messages and optional caption on share messages',
    example: 'Hey, check out this track!',
    nullable: true,
  })
  @Expose()
  content?: string | null;

  @ApiPropertyOptional({
    description: 'UUID of the shared track. Present only when messageType is track_share',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    nullable: true,
  })
  @Expose()
  sharedTrackId?: string | null;

  @ApiPropertyOptional({
    description: 'UUID of the shared playlist. Present only when messageType is playlist_share',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    nullable: true,
  })
  @Expose()
  sharedPlaylistId?: string | null;

  @ApiProperty({
    description: 'ISO timestamp of when the message was sent',
    example: '2025-01-15T10:30:00.000Z',
  })
  @Expose()
  createdAt!: Date;
}
