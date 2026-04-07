import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class TrackOwnerDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @Expose()
  userId!: string;

  @ApiProperty({ example: 'yara_senousy' })
  @Expose()
  username!: string;

  @ApiProperty({ example: 'Yara Senousy', nullable: true })
  @Expose()
  displayName!: string | null;

  @ApiProperty({ example: 'https://s3.amazonaws.com/avatars/user_123.jpg', nullable: true })
  @Expose()
  avatarUrl!: string | null;
}
