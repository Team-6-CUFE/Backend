import { IsString, IsNotEmpty, MaxLength, IsOptional, IsBoolean, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlaylistDto {
  @ApiProperty({
    description: 'Playlist title',
    example: 'Late Night Lo-Fi Beats',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    description: 'Optional description of the playlist',
    example: 'Chill beats to study and relax to.',
  })
  @IsOptional()
  @IsString()
  description!: string;

  @ApiPropertyOptional({
    description: 'URL of the cover image',
    example: 'https://s3.amazonaws.com/covers/my-playlist.jpg',
  })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'cover_image must be a valid URL' })
  coverimage!: string;

  @ApiProperty({
    description: 'Visibility of the playlist',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  isPublic!: boolean;
}
