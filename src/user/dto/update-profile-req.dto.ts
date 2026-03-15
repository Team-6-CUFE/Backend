import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUrl,
  IsArray,
  IsIn,
  MaxLength,
  ArrayMaxSize,
  Matches,
} from 'class-validator';

export class UpdateProfileReqDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  display_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsIn(['male', 'female', 'other', 'prefer_not_to_say'])
  gender?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'birthdate must be in YYYY-MM-DD format' })
  birthdate?: string;

  // this is named differently since it cant be automatically mapped anwyays
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10, { message: 'Maximum 10 genres allowed' })
  favoriteGenres?: string[];

  @IsOptional()
  @IsUrl({}, { message: 'support_link must be a valid URL' })
  support_link?: string;

  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}
