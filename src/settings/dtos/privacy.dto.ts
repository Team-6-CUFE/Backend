import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class PrivacySettingsDto {
  @ApiPropertyOptional({ description: 'Show my activities to others' })
  @IsOptional()
  @IsBoolean()
  @Expose()
  showMyActivities: boolean = true;

  @ApiPropertyOptional({ description: 'Allow messages from anyone' })
  @IsOptional()
  @IsBoolean()
  @Expose()
  allowMessagesFromAnyone: boolean = true;

  @ApiPropertyOptional({ description: 'Show when I am a top or first fan' })
  @IsOptional()
  @IsBoolean()
  @Expose()
  showWhenTopOrFirstFan: boolean = true;

  @ApiPropertyOptional({ description: 'Show my track top and first fans' })
  @IsOptional()
  @IsBoolean()
  @Expose()
  showMyTrackTopAndFirstFans: boolean = true;
}
