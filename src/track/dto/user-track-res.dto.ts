import { Expose, Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TrackVisibility } from '../enums/track-visibility.enum';

@Exclude()
export class UserTrackResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @Expose()
  trackId!: string;

  @ApiProperty({ example: 'Midnight Drive' })
  @Expose()
  title!: string;

  @ApiProperty({ example: 'Lo-fi session recorded live.', nullable: true })
  @Expose()
  description!: string | null;

  @ApiProperty({ example: 'https://s3.amazonaws.com/covers/midnight.jpg', nullable: true })
  @Expose()
  coverImage!: string | null;

  @ApiProperty({ example: 'https://s3.amazonaws.com/waveforms/midnight.json', nullable: true })
  @Expose()
  waveformUrl!: string | null;

  @ApiProperty({ example: 213 })
  @Expose()
  durationSeconds!: number;

  @ApiProperty({ example: 1500 })
  @Expose()
  playCount!: number;

  @ApiProperty({ example: 320 })
  @Expose()
  likesCount!: number;

  @ApiProperty({ example: 30 })
  @Expose()
  repostsCount!: number;

  @ApiProperty({ example: 14 })
  @Expose()
  commentsCount!: number;

  @ApiProperty({ enum: TrackVisibility, example: TrackVisibility.PUBLIC })
  @Expose()
  visibility!: TrackVisibility;

  @ApiProperty({ example: false })
  @Expose()
  explicitContent!: boolean;

  @ApiProperty({ example: '2024-06-01T12:00:00Z' })
  @Expose()
  createdAt!: Date;
}
