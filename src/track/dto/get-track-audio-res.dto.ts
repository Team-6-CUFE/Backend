import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class TrackAudioResDto {
  @ApiProperty({ example: 'https://s3.amazonaws.com/audio/track_123.mp3', nullable: true })
  @Expose()
  audioUrl!: string | null;

  @ApiProperty({ example: 'https://s3.amazonaws.com/previews/track_123.mp3', nullable: true })
  @Expose()
  previewAudioUrl!: string | null;

  @ApiProperty({ example: 214 })
  @Expose()
  durationSeconds!: number;
}
