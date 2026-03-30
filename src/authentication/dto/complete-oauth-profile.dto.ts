import { IsNotEmpty, IsString, IsDate, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Gender } from '../../user/dto/create-user.dto';

export class CompleteOAuthProfileDto {
  @ApiProperty({
    description: 'Short-lived pending token received from the OAuth callback response',
    example: 'a1e4ae8b90f6cd13291249...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Pending token is required' })
  pendingToken!: string;

  @ApiProperty({
    description: 'Display name shown on the user profile',
    example: 'Yara Senousy',
  })
  @IsString()
  @IsNotEmpty({ message: 'Display name is required' })
  displayName!: string;

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
}
