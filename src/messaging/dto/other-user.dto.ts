import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class OtherUserDto {
  @ApiProperty() @Expose() userId!: string;

  @ApiProperty() @Expose() username!: string;

  @ApiProperty() @Expose() displayName!: string;

  @ApiPropertyOptional() @Expose() avatarUrl?: string | null;
}
