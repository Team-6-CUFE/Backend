import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
// TODO: REMOVE when changes are implemented in front/cross, replaced in update-profile-req.dto and update-profile-res.dto
export class UpdatePrivacyReqDto {
  @ApiProperty({
    description: 'Set to true for a public account, false for private',
    example: false,
  })
  @IsBoolean({ message: 'isPublic must be a boolean' })
  isPublic!: boolean;
}
