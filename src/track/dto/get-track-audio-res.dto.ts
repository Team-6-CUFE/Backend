import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
// TODO: REMOVE when changes are implemented in front/cross, replaced in get-track-res.dto
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
