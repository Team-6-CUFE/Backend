import { IsUUID, IsBoolean } from 'class-validator';

export class TypingDto {
  @IsUUID()
  chatId!: string;

  @IsBoolean()
  isTyping!: boolean;
}
