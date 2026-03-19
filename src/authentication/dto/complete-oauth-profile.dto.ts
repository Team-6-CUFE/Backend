import { IsNotEmpty, IsString, IsDate, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { Gender } from '../../user/dto/create-user.dto';

export class CompleteOAuthProfileDto {
  @IsString()
  @IsNotEmpty({ message: 'Pending token is required' })
  pending_token!: string;

  @IsString()
  @IsNotEmpty({ message: 'CAPTCHA token is required' })
  display_name!: string;

  @IsDate({ message: 'Birthdate must be a valid date' })
  @IsNotEmpty({ message: 'Birthdate is required' })
  @Type(() => Date)
  birthdate!: Date;

  @IsEnum(Gender, {
    message: 'Gender must be one of: male, female',
  })
  @IsNotEmpty({ message: 'Gender is required' })
  gender!: Gender;
}
