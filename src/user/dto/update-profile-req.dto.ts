import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUrl,
  IsArray,
  IsIn,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';

export class UpdateProfileReqDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  displayName?: string;

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
  @IsIn(['male', 'female', 'other', 'preferNotToSay'])
  gender?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10, { message: 'Maximum 10 genres allowed' })
  favoriteGenres?: string[];

  @IsOptional()
  @IsUrl({}, { message: 'supportLink must be a valid URL' })
  supportLink?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
