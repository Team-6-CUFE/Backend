import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlaylistDto {
  @ApiPropertyOptional({
    description: 'New playlist title (cannot be empty if provided)',
    example: 'Updated Playlist Title',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Title should not be empty' })
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'New description of the playlist',
    example: 'A new description.',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
