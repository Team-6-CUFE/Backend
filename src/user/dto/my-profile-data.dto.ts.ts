import { Expose, Exclude } from 'class-transformer';
import { ExternalProfileDto } from './external-profile.dto';
import { BaseProfileDataDto } from './base-profile.dto';

@Exclude()
export class MyProfileDataDto extends BaseProfileDataDto {
  @Expose() email!: string | null;

  @Expose() birthdate!: string | null;

  @Expose() gender!: string | null;

  @Expose() plan!: string;

  @Expose() updated_at!: Date;

  @Expose() external_profiles!: (ExternalProfileDto & { id: string })[];
}
