import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportReason, ReportType } from '../report-enums';

export class CreateReportDto {
  @ApiProperty({
    description: 'The type of the reported target.',
    enum: ReportType,
    example: ReportType.TRACK,
  })
  @IsEnum(ReportType)
  @IsNotEmpty()
  type!: ReportType;

  @ApiProperty({
    description: 'UUID of the reported user / track / comment.',
    format: 'uuid',
    example: 'b6fc3946-ee96-4721-9118-5ca776a874f8',
  })
  @IsUUID()
  @IsNotEmpty()
  targetId!: string;

  @ApiProperty({
    description: 'The reason for the report.',
    enum: ReportReason,
    example: ReportReason.COPYRIGHT,
  })
  @IsEnum(ReportReason)
  @IsNotEmpty()
  reason!: ReportReason;

  @ApiPropertyOptional({
    description: 'Optional additional context provided by the reporter.',
    example: 'This track uses my original composition without permission.',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
