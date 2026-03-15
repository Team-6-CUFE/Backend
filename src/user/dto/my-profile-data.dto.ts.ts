import { ExternalProfileDto } from './external-profile.dto';
import { BaseProfileDataDto } from './base-profile.dto';

export class MyProfileDataDto extends BaseProfileDataDto {
  email!: string | null;

  birthdate!: string | null;

  gender!: string | null;

  plan!: string;

  updated_at!: Date;

  external_profiles!: (ExternalProfileDto & { id: string })[];
}
