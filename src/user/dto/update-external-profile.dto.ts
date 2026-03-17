import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class UpdateExternalProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: string;

  @IsUrl({}, { message: 'Please provide a valid URL' })
  @IsOptional()
  @MaxLength(500)
  url?: string;
}
