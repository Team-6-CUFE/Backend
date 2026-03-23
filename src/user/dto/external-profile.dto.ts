import { Expose, Exclude } from 'class-transformer';

@Exclude()
export class ExternalProfileDto {
  @Expose() name!: string;

  @Expose() url!: string;
}
