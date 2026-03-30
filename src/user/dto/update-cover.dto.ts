import { IsString, IsUrl, IsNotEmpty } from 'class-validator';

export class UpdateCoverDto {
  @IsNotEmpty({ message: 'Cover photo URL cannot be empty' })
  @IsString({ message: 'Cover photo URL must be a string' })
  @IsUrl({}, { message: 'Please provide a valid URL' })
  coverPhoto!: string;
}
