import { IsBoolean, IsOptional } from 'class-validator';

export class EmailNotificationsDto {
  @IsOptional() @IsBoolean() newFollower?: boolean;

  @IsOptional() @IsBoolean() repost?: boolean;

  @IsOptional() @IsBoolean() newPost?: boolean;

  @IsOptional() @IsBoolean() likesPlays?: boolean;

  @IsOptional() @IsBoolean() comment?: boolean;

  @IsOptional() @IsBoolean() recommended?: boolean;

  @IsOptional() @IsBoolean() newMessage?: boolean;
}
