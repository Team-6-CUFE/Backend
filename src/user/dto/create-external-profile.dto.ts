import { IsString, IsNotEmpty, IsUrl, MaxLength } from 'class-validator';

export class CreateExternalProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string; // e.g., 'Instagram'

  @IsUrl({}, { message: 'Please provide a valid URL' })
  @IsNotEmpty()
  @MaxLength(500)
  url!: string; // e.g., 'https://instagram.com/omar'
}
