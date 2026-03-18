import { IsBoolean } from 'class-validator';

export class UpdatePrivacyReqDto {
  @IsBoolean({ message: 'is_public must be a boolean' })
  is_public!: boolean;
}
