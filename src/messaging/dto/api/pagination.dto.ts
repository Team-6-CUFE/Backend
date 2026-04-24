import { ApiProperty } from '@nestjs/swagger';

export class PaginationDto {
  @ApiProperty({ example: 1 }) currentPage!: number;

  @ApiProperty({ example: 3 }) totalPages!: number;

  @ApiProperty({ example: 42 }) totalCount!: number;

  @ApiProperty({ example: 20 }) limit!: number;
}
