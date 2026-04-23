import { IsUUID } from 'class-validator';

export class MarkReadDto {
  @IsUUID()
  chatId!: string;

  @IsUUID()
  lastReadMessageId!: string;
}
