import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
    description: 'Unique username — 3 to 50 characters, letters, numbers, and underscores only',
    example: 'yara_senousy',
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(50, { message: 'Username must be at most 50 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  @Transform(({ value }) => value.trim().toLowerCase())
  username!: string;

  @ApiProperty({
    description: 'First name (max 100 characters)',
    example: 'Yara',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MaxLength(100, { message: 'First name must be at most 100 characters' })
  @Transform(({ value }) => value.trim())
  first_name!: string;

  @ApiProperty({
    description: 'Last name (max 100 characters)',
    example: 'Senousy',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MaxLength(100, { message: 'Last name must be at most 100 characters' })
  @Transform(({ value }) => value.trim())
  last_name!: string;

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

  @ApiProperty({
    description: 'Country name (max 100 characters)',
    example: 'Egypt',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Country is required' })
  @MaxLength(100, { message: 'Country must be at most 100 characters' })
  @Transform(({ value }) => value.trim())
  country!: string;
}
