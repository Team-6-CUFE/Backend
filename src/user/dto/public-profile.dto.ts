import { Expose, Exclude } from 'class-transformer';
import { BaseProfileDataDto } from './base-profile.dto';
import { ExternalProfileDto } from './external-profile.dto';

@Exclude()
export class PublicProfileDataDto extends BaseProfileDataDto {
  @Expose() external_profiles!: ExternalProfileDto[];
}
