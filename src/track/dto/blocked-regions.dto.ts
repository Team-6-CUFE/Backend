import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayUnique, IsNotEmpty } from 'class-validator';

export class BlockedRegionsDto {
  @ApiProperty({
    description:
      'Full list of country names to block' +
      'lookup (e.g. "Egypt", "United States"). Replaces the existing blocked regions entirely. ' +
      'Pass an empty array to unblock all regions.',
    type: [String],
    example: ['Egypt', 'United States', 'Germany'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @ArrayUnique()
  blockedRegions!: string[];
}
