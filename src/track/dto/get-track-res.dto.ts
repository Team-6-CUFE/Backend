import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TrackVisibility } from '../enums/track-visibility.enum';
import { TrackStatus } from '../enums/track-status.enum';
import { TrackGenreDto } from './track-genre.dto';
import { TrackOwnerDto } from './track-owner.dto';
import { TrackTagDto } from './track-tag.dto';

@Exclude()
export class GetTrackResDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440010' })
  @Expose()
  trackId!: string;

  @ApiProperty({ example: 'Summer Nights' })
  @Expose()
  title!: string;

  @ApiProperty({ example: 'A deep house track recorded live in Cairo.', nullable: true })
  @Expose()
  description!: string | null;

  @ApiProperty({ example: 'https://s3.amazonaws.com/covers/track_123.jpg', nullable: true })
  @Expose()
  coverImage!: string | null;

  @ApiProperty({ example: 214 })
  @Expose()
  durationSeconds!: number;

  @ApiProperty({ enum: TrackStatus, example: TrackStatus.FINISHED })
  @Expose()
  trackStatus!: TrackStatus;

  @ApiProperty({ example: 'https://s3.amazonaws.com/waveforms/track_123.json', nullable: true })
  @Expose()
  waveformUrl!: string | null;

  @ApiProperty({ example: 'https://s3.amazonaws.com/audio/track_123.mp3', nullable: true })
  @Expose()
  audioUrl!: string | null;

  @ApiProperty({ example: 'https://s3.amazonaws.com/previews/track_123.mp3', nullable: true })
  @Expose()
  previewAudioUrl!: string | null;

  @ApiProperty({ example: 1042 })
  @Expose()
  playCount!: number;

  @ApiProperty({ example: 87 })
  @Expose()
  likesCount!: number;

  @ApiProperty({ example: 14 })
  @Expose()
  repostsCount!: number;

  @ApiProperty({ example: 5 })
  @Expose()
  commentsCount!: number;

  @ApiProperty({ enum: TrackVisibility, example: TrackVisibility.PUBLIC })
  @Expose()
  visibility!: TrackVisibility;

  @ApiProperty({ example: false })
  @Expose()
  explicitContent!: boolean;

  @ApiProperty({ example: '2025-06-01', nullable: true })
  @Expose()
  releaseDate!: Date | null;

  @ApiProperty({ type: () => TrackGenreDto, nullable: true })
  @Expose()
  @Type(() => TrackGenreDto)
  genre!: TrackGenreDto | null;

  @ApiProperty({ example: ['deep house', 'cairo', 'summer', 'live'] })
  @Expose()
  @Type(() => TrackTagDto)
  tags!: TrackTagDto[];

  @ApiProperty({ type: () => TrackOwnerDto })
  @Expose()
  @Type(() => TrackOwnerDto)
  owner!: TrackOwnerDto;

  @ApiProperty({ example: '2025-06-01T10:00:00Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2025-06-10T09:15:00Z' })
  @Expose()
  updatedAt!: Date;

  @ApiProperty({
    description: 'Main artist names',
    type: [String],
    example: ['Artist A', 'Artist B'],
  })
  @Expose()
  mainArtists?: string[];
}
