import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlaylistDto {
  @ApiPropertyOptional({ example: 'Updated Playlist Title' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 'A new description.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://s3.amazonaws.com/covers/pl_abc123_new.jpg',
    name: 'cover_image',
  })
  @IsString()
  @IsOptional()
  cover_image?: string;
}
