import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsISRC,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TrackVisibility } from '../enums/track-visibility.enum';

export class UpdateTrackDto {
  // ── Core ─────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Track title', example: 'Midnight Drive (Extended Mix)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Track description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description:
      'Preview clip start time in HH:MM:SS format (stored; takes effect on next audio re-upload)',
    example: '00:01:00',
  })
  @IsOptional()
  @IsString()
  previewStartTime?: string;

  @ApiPropertyOptional({
    description: 'Track visibility',
    enum: TrackVisibility,
  })
  @IsOptional()
  @IsEnum(TrackVisibility)
  visibility?: TrackVisibility;

  // ── Artists ───────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    description: 'Main artist names (comma-separated string or JSON array)',
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

  // ── Distribution metadata ─────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'https://bandcamp.com/track/midnight-drive' })
  @IsOptional()
  @IsUrl()
  buyLink?: string;

  @ApiPropertyOptional({ example: 'Interscope Records' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  recordLabel?: string;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @ApiPropertyOptional({ example: 'Sony Music Publishing' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  publisher?: string;

  @ApiPropertyOptional({ example: 'USRC17607839' })
  @IsOptional()
  @IsISRC()
  isrc?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  explicitContent?: boolean;

  @ApiPropertyOptional({ example: '℗ 2026 Atlantic Records' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  pLine?: string;

  @ApiPropertyOptional({ example: 'midnight-drive-extended' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  trackLink?: string;

  // ── Playback permissions ──────────────────────────────────────────────────

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  enableDirectDownloads?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  offlineListening?: boolean;

  // ── Licensing ─────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  attribution?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  noncommercial?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  noDerivativeWorks?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  shareAlike?: boolean;

  @ApiPropertyOptional({
    description: 'Genre UUIDs — replaces the full genre list',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((s: string) => s.trim()) : value
  )
  genreIds?: string[];

  @ApiPropertyOptional({
    description: 'Tag names — replaces the full tag list (auto-created if new)',
    type: [String],
    example: ['lo-fi', 'chillhop', 'study'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((s: string) => s.trim()) : value
  )
  tags?: string[];
}
