import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkReadDto {
  @ApiProperty({
    description: 'UUID of the chat',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  chatId!: string;

  @ApiProperty({
    description:
      'UUID of the last message the user has read — all messages up to and including this one are marked read',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  lastReadMessageId!: string;
}
