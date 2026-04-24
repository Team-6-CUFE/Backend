import { IsUUID, IsString, IsOptional, IsEnum, ValidateIf, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../../enums/message-type.enum';

export class SendMessageDto {
  @ApiProperty({
    description: 'UUID of the chat to send the message to',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  chatId!: string;

  @ApiProperty({
    description: 'Type of message being sent',
    enum: MessageType,
    example: MessageType.TEXT,
  })
  @IsEnum(MessageType)
  messageType!: MessageType;

  @ApiPropertyOptional({
    description:
      'Text content. Required when messageType is text. Optional caption for share messages. Max 2000 characters',
    example: 'Hey, listen to this!',
    maxLength: 2000,
  })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: 'UUID of the track to share. Required when messageType is track_share',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @ValidateIf((o) => o.messageType === MessageType.TRACK_SHARE)
  sharedTrackId?: string;

  @ApiPropertyOptional({
    description: 'UUID of the playlist to share. Required when messageType is playlist_share',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @ValidateIf((o) => o.messageType === MessageType.PLAYLIST_SHARE)
  sharedPlaylistId?: string;
}

export { MessageType };
