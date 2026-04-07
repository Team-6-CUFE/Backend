import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class GenresResDto {
  @ApiProperty({ example: 'genre_001' })
  @Expose()
  genreId!: string;

  @ApiProperty({ example: 'Electronic' })
  @Expose()
  name!: string;
}
