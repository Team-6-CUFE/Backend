import {
  IsString,
  IsOptional,
  MaxLength,
  IsArray,
  IsEnum,
  IsDateString,
  IsUrl,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PlaylistType } from '../entities/playlist.entity';

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

  @ApiPropertyOptional({ example: ['chill', 'lo-fi', 'study'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Type(() => String)
  tags?: string[];

  @ApiPropertyOptional({ example: 'https://bandcamp.com/my-link' })
  @IsUrl()
  @IsOptional()
  buyLink?: string;

  @ApiPropertyOptional({ example: 'Harmonica Records' })
  @IsString()
  @IsOptional()
  recordLabel?: string;

  @ApiPropertyOptional({ example: 'Rock & Roll' })
  @IsString()
  @IsOptional()
  genre?: string;

  @ApiPropertyOptional({ enum: PlaylistType, example: PlaylistType.ALBUM })
  @IsEnum(PlaylistType)
  @IsOptional()
  type?: PlaylistType;

  @ApiPropertyOptional({ example: '2026-04-07', description: 'Release date in YYYY-MM-DD format' })
  @IsDateString()
  @IsOptional()
  releaseDate?: string;

  @ApiPropertyOptional({ example: 'summer-vibes-2026' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  permalink?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
