import { IsDateString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScheduleReleaseDto {
  @ApiProperty({
    description: 'ISO 8601 datetime in Egypt timezone (+03:00)',
    example: '2026-06-01T12:00:00+03:00',
  })
  @IsDateString()
  @Matches(/\+03:00$/, {
    message: 'scheduledAt must use Egypt timezone offset (+03:00)',
  })
  scheduledAt!: string;
}
