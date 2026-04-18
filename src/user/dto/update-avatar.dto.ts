import { IsString, IsUrl, IsNotEmpty } from 'class-validator';
// TODO: REMOVE when changes are implemented in front/cross
export class UpdateAvatarDto {
  @IsNotEmpty({ message: 'Avatar URL cannot be empty' })
  @IsString({ message: 'Avatar URL must be a string' })
  @IsUrl({}, { message: 'Please provide a valid URL' })
  avatarUrl!: string;
}
