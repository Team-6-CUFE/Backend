import { IsString, IsUrl, IsNotEmpty } from 'class-validator';

export class UpdateAvatarDto {
  @IsNotEmpty({ message: 'Avatar URL cannot be empty' })
  @IsString({ message: 'Avatar URL must be a string' })
  @IsUrl({}, { message: 'Please provide a valid URL' })
  avatar_url!: string;
}
