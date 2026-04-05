import { Expose, Exclude, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PlaylistOwnerDto } from './playlist-owner.dto';

@Exclude()
export class TrackPlaylistResponseDto {
  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440010' })
  @Expose()
  playlistId!: string;

  @ApiProperty({ example: 'Late Night Vibes' })
  @Expose()
  title!: string;

  @ApiProperty({ example: 'Chill tracks for late nights.', nullable: true })
  @Expose()
  description!: string | null;

  @ApiProperty({ example: 'https://s3.amazonaws.com/covers/late-night.jpg', nullable: true })
  @Expose()
  coverImage!: string | null;

  @ApiProperty({ example: true })
  @Expose()
  isPublic!: boolean;

  @ApiProperty({ example: 14 })
  @Expose()
  tracksCount!: number;

  @ApiProperty({ example: 3120 })
  @Expose()
  totalDurationSeconds!: number;

  @ApiProperty({ type: () => PlaylistOwnerDto })
  @Expose()
  @Type(() => PlaylistOwnerDto)
  owner!: PlaylistOwnerDto;

  @ApiProperty({ example: '2024-06-01T12:00:00Z' })
  @Expose()
  addedAt!: Date;
}
