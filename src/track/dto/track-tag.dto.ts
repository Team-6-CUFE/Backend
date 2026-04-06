import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class TrackTagDto {
  @ApiProperty({ example: 'deep house' })
  @Expose()
  name!: string;
}
