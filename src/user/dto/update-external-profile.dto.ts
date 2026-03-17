import { IsString, IsNotEmpty, IsUrl, MaxLength, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateExternalProfileDto {
  @IsOptional()
  @Transform(({ value }: { value: any }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Name cannot be empty' })
  @MaxLength(50, { message: 'Name cannot be longer than 50 characters' })
  name?: string;

  @IsOptional()
  @Transform(({ value }: { value: any }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'URL cannot be empty' })
  @IsUrl({ require_protocol: false }, { message: 'Must be a valid URL format' })
  @MaxLength(255, { message: 'URL cannot be longer than 255 characters' })
  url?: string;
}
