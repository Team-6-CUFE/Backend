import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EmailNotificationsDto } from './email-notifications.dto';
import { DeviceNotificationsDto } from './device-notifications.dto';

export class UpdateNotificationsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailNotificationsDto)
  email?: EmailNotificationsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceNotificationsDto)
  device?: DeviceNotificationsDto;
}
