import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChatDto {
  @ApiProperty({
    description: 'UUID of the user to start a chat with',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  participantTwoId!: string;
}
