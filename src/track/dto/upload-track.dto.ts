import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsISRC,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TrackVisibility } from '../enums/track-visibility.enum';

export class UploadTrackDto {
  @ApiProperty({ description: 'Track title', example: 'My Track' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ description: 'Track description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Preview start time in HH:MM:SS format',
    example: '00:00:30',
  })
  @IsOptional()
  @IsString()
  previewStartTime?: string;

  @ApiPropertyOptional({
    description: 'Track visibility',
    enum: TrackVisibility,
    default: TrackVisibility.PUBLIC,
  })
  @IsOptional()
  @IsEnum(TrackVisibility)
  visibility?: TrackVisibility;

  @ApiPropertyOptional({
    description: 'Main artist names',
    type: [String],
    example: ['Artist A', 'Artist B'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((s: string) => s.trim()) : value
  )
  mainArtists?: string[];

  @ApiPropertyOptional({ description: 'Buy/purchase link', example: 'https://bandcamp.com/...' })
  @IsOptional()
  @IsUrl()
  buyLink?: string;

  @ApiPropertyOptional({ description: 'Record label name', example: 'Interscope Records' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  recordLabel?: string;

  @ApiPropertyOptional({ description: 'Release date (ISO 8601)', example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @ApiPropertyOptional({ description: 'Publisher name', example: 'Sony Music Publishing' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  publisher?: string;

  @ApiPropertyOptional({
    description: 'International Standard Recording Code (ISRC)',
    example: 'USRC17607839',
  })
  @IsOptional()
  @IsISRC()
  isrc?: string;

  @ApiPropertyOptional({ description: 'Contains explicit content', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  explicitContent?: boolean;

  @ApiPropertyOptional({
    description: 'Phonogram copyright line',
    example: '℗ 2026 Atlantic Records',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  pLine?: string;

  @ApiPropertyOptional({ description: 'Custom track permalink', example: 'my-track-2026' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  trackLink?: string;

  @ApiPropertyOptional({ description: 'Allow direct audio file downloads', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  enableDirectDownloads?: boolean;

  @ApiPropertyOptional({ description: 'Allow offline listening', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  offlineListening?: boolean;

  @ApiPropertyOptional({ description: 'Require attribution', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  attribution?: boolean;

  @ApiPropertyOptional({ description: 'Noncommercial use only', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  noncommercial?: boolean;

  @ApiPropertyOptional({ description: 'No derivative works allowed', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  noDerivativeWorks?: boolean;

  @ApiPropertyOptional({ description: 'Share alike required', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  shareAlike?: boolean;
}
