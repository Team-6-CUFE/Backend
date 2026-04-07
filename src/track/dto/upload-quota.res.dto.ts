import { Expose, Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class UploadQuotaResponseDto {
  @ApiProperty({ example: 'pro' })
  @Expose()
  plan!: string;

  @ApiProperty({ example: 87 })
  @Expose()
  usedMinutes!: number;

  @ApiProperty({ example: 240, nullable: true, description: 'null when plan is unlimited' })
  @Expose()
  limitMinutes!: number | null;

  @ApiProperty({ example: 153, nullable: true, description: 'null when plan is unlimited' })
  @Expose()
  remainingMinutes!: number | null;
}
