import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}

export class CreateUserDto {
  @ApiProperty({
    description: 'Valid email address',
    example: 'yara@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }) => value.trim().toLowerCase())
  email!: string;

  @ApiProperty({
    description: 'Min 8 characters, must include uppercase, lowercase, and a number',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password!: string;

  @ApiProperty({
    description: 'Display name shown on the user profile (max 100 characters)',
    example: 'Yara Senousy',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Display name is required' })
  @MaxLength(100, { message: 'Display name must be at most 100 characters' })
  @Transform(({ value }) => value.trim())
  display_name!: string;

  @ApiProperty({
    description: 'Date of birth in YYYY-MM-DD format. Must be at least 13 years old.',
    example: '1995-06-15',
    type: String,
    format: 'date',
  })
  @IsDate({ message: 'Birthdate must be a valid date' })
  @IsNotEmpty({ message: 'Birthdate is required' })
  @Type(() => Date)
  birthdate!: Date;

  @ApiProperty({
    description: 'Gender',
    enum: Gender,
    example: Gender.FEMALE,
  })
  @IsEnum(Gender, { message: 'Gender must be one of: male, female' })
  @IsNotEmpty({ message: 'Gender is required' })
  gender!: Gender;

  @ApiPropertyOptional({
    description: 'Country code auto-detected from IP address (e.g. EG)',
    example: 'EG',
  })
  @IsString()
  @IsOptional()
  country?: string | null;

  @ApiPropertyOptional({
    description: 'City auto-detected from IP address (e.g. Cairo)',
    example: 'Cairo',
  })
  @IsString()
  @IsOptional()
  city?: string | null;
}
