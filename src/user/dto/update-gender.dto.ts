import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
// TODO: REMOVE when changes are implemented in front/cross, replaced in update-profile-req.dto and update-profile-res.dto
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
