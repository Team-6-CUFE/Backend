import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateGenderReqDto {
  @ApiProperty({
    description: 'Gender value',
    enum: ['male', 'female', 'preferNotToSay'],
    example: 'male',
  })
  @IsIn(['male', 'female', 'preferNotToSay'], {
    message: "Gender must be one of: 'male','female','preferNotToSay'",
  })
  gender!: string;
}
