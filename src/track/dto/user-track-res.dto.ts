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

  @ApiProperty({
    example: 'https://s3.amazonaws.com/audio/midnight.mp3',
    nullable: true,
    description: "null when the track is blocked in the requester's region",
  })
  @Expose()
  audioUrl!: string | null;

  @ApiProperty({
    example: 'https://s3.amazonaws.com/waveforms/midnight.json',
    nullable: true,
    description: "null when the track is blocked in the requester's region",
  })
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

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  artistId!: string;

  @ApiProperty({ example: 'Jane Doe' })
  @Expose()
  artistDisplayName!: string;

  @ApiProperty({ example: 'jane_doe' })
  @Expose()
  artistUsername!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  @Expose()
  genreId!: string;

  @ApiProperty({ example: 'Lo-fi' })
  @Expose()
  genreName!: string;

  @ApiProperty({ example: '2024-06-01T12:00:00Z' })
  @Expose()
  createdAt!: Date;
}
