import { Expose, Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class PlaylistOwnerDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @Expose()
  userId!: string;

  @ApiProperty({ example: 'dj_nour' })
  @Expose()
  username!: string;

  @ApiProperty({ example: 'Nour', nullable: true })
  @Expose()
  displayName!: string | null;

  @ApiProperty({ example: 'https://s3.amazonaws.com/avatars/nour.jpg', nullable: true })
  @Expose()
  avatarUrl!: string | null;
}
