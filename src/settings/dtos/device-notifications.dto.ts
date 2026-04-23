import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { DeviceMessagePreference } from '../entities/settings.entity';

export class DeviceNotificationsDto {
  @IsOptional() @IsBoolean() newFollower?: boolean;

  @IsOptional() @IsBoolean() repost?: boolean;

  @IsOptional() @IsBoolean() newPost?: boolean;

  @IsOptional() @IsBoolean() likesPlays?: boolean;

  @IsOptional() @IsBoolean() comment?: boolean;

  @IsOptional() @IsBoolean() recommended?: boolean;

  @IsOptional()
  @IsEnum(DeviceMessagePreference, {
    message: "Invalid value for device.new_message. Allowed values: 'everyone', 'followed', 'off'",
  })
  newMessage?: DeviceMessagePreference;
}
