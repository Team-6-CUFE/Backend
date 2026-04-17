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
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotFutureDate,
  IsRealisticAge,
  IsOldEnough,
} from '../decorators/valid-birthdate.decorator';

export class UpdateProfileReqDto {
  @ApiPropertyOptional({ description: 'First name', example: 'Moaaz', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name', example: 'Dev', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Display name shown on profile',
    example: 'Moaaz Dev',
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  displayName?: string;

  @ApiPropertyOptional({
    description:
      'Username — must start with a letter, letters/numbers/underscores only, no consecutive underscores',
    example: 'moaaz_dev',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  username?: string;

  @ApiPropertyOptional({
    description: 'Short bio or description',
    example: 'Backend dev and music lover.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @ApiPropertyOptional({ description: 'Country name', example: 'Egypt', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'City name', example: 'Cairo', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: "Gender — accepted values: 'male', 'female', 'preferNotToSay'",
    example: 'male',
    enum: ['male', 'female', 'preferNotToSay'],
  })
  @IsOptional()
  @IsIn(['male', 'female', 'preferNotToSay'])
  gender?: string;

  @ApiPropertyOptional({
    description: 'Favorite genre names — replaces the existing list entirely. Maximum 10.',
    example: ['Rock', 'Jazz'],
    type: [String],
    maxItems: 10,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10, { message: 'Maximum 10 genres allowed' })
  favoriteGenres?: string[];

  @ApiPropertyOptional({
    description: 'Support/tip link — must be a valid URL',
    example: 'https://ko-fi.com/moaaz',
  })
  @IsOptional()
  @IsUrl({}, { message: 'supportLink must be a valid URL' })
  supportLink?: string;

  @ApiPropertyOptional({
    description: 'Set to true for public account, false for private',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description:
      'Birthdate in YYYY-MM-DD format. Must not be in the future, user must be at least 13 and at most 120 years old.',
    example: '1999-05-15',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Birthdate must be in YYYY-MM-DD format' })
  @IsNotFutureDate({ message: 'Birthdate cannot be in the future' })
  @IsOldEnough({ message: 'You must be at least 13 years old' })
  @IsRealisticAge({ message: 'Please enter a valid birthdate' })
  birthdate?: string;
}
