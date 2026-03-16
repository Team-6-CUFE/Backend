import { Expose, Exclude } from 'class-transformer';

@Exclude()
export class UpdateProfileResDto {
  @Expose() user_id!: string;

  @Expose() username!: string;

  @Expose() first_name?: string | null;

  @Expose() last_name?: string | null;

  @Expose() display_name?: string | null;

  @Expose() bio?: string | null;

  @Expose() country?: string | null;

  @Expose() city?: string | null;

  @Expose() gender?: string | null;

  @Expose() favorite_genres!: string[];

  @Expose() support_link?: string | null;

  @Expose() is_public!: boolean;

  @Expose() updated_at!: Date;
}
