import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinChatDto {
  @ApiProperty({
    description: 'UUID of the chat room to join',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  chatId!: string;
}
