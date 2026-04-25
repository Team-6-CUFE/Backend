import { IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TypingDto {
  @ApiProperty({
    description: 'UUID of the chat the user is typing in',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  chatId!: string;

  @ApiProperty({
    description: 'True when the user starts typing, false when they stop',
    example: true,
  })
  @IsBoolean()
  isTyping!: boolean;
}
