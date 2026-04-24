import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class OtherUserDto {
  @ApiProperty({
    description: 'UUID of the other participant',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @Expose()
  userId!: string;

  @ApiProperty({
    description: 'Unique username of the other participant',
    example: 'jane_smith',
  })
  @Expose()
  username!: string;

  @ApiProperty({
    description: 'Display name of the other participant',
    example: 'Jane Smith',
  })
  @Expose()
  displayName!: string;

  @ApiPropertyOptional({
    description: 'Profile avatar URL, null if not set',
    example: 'https://s3.amazonaws.com/avatars/jane.jpg',
    nullable: true,
  })
  @Expose()
  avatarUrl?: string | null;
}
