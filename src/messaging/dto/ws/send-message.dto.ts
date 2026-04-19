import { IsUUID, IsString, IsOptional, IsEnum, ValidateIf, MaxLength } from 'class-validator';
import { MessageType } from '../../enums/message-type.enum';

export class SendMessageDto {
  @IsUUID()
  chatId!: string;

  @IsEnum(MessageType)
  messageType!: MessageType;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  content?: string;

  @IsUUID()
  @ValidateIf((o) => o.messageType === MessageType.TRACK_SHARE)
  sharedTrackId?: string;

  @IsUUID()
  @ValidateIf((o) => o.messageType === MessageType.PLAYLIST_SHARE)
  sharedPlaylistId?: string;
}

export { MessageType };
