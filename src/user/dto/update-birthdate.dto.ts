import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotFutureDate,
  IsRealisticAge,
  IsOldEnough,
} from '../decorators/valid-birthdate.decorator';
// TODO: REMOVE when changes are implemented in front/cross, replaced in update-profile-req.dto and update-profile-res.dto

export class UpdateBirthdateReqDto {
  @ApiProperty({
    description:
      'Birthdate in YYYY-MM-DD format. Must not be in the future, user must be at least 13 and at most 120 years old.',
    example: '1999-05-15',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Birthdate must be in YYYY-MM-DD format' })
  @IsNotFutureDate({ message: 'Birthdate cannot be in the future' })
  @IsOldEnough({ message: 'You must be at least 13 years old' })
  @IsRealisticAge({ message: 'Please enter a valid birthdate' })
  birthdate!: string;
}
