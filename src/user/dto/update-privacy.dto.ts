import { IsBoolean } from 'class-validator';

export class UpdatePrivacyReqDto {
  @IsBoolean({ message: 'isPublic must be a boolean' })
  isPublic!: boolean;
}
