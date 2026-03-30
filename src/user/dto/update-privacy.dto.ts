import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdatePrivacyReqDto {
  @ApiProperty({
    description: 'Set to true for a public account, false for private',
    example: false,
  })
  @IsBoolean({ message: 'isPublic must be a boolean' })
  isPublic!: boolean;
}
