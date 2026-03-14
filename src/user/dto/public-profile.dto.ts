import { BaseProfileDataDto } from './base-profile.dto';
import { ExternalProfileDto } from './external-profile.dto';

export class PublicProfileDataDto extends BaseProfileDataDto {
  external_profiles!: ExternalProfileDto[];
}
