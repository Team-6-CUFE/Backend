import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddTrackDto {
  @ApiProperty({
    description: 'UUID of the track to add',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  trackId!: string;
}
