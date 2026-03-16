import { Expose, Exclude } from 'class-transformer';

@Exclude()
export class BaseProfileDataDto {
  @Expose() user_id!: string;

  @Expose() username!: string;

  @Expose() first_name!: string | null;

  @Expose() last_name!: string | null;

  @Expose() display_name!: string | null;

  @Expose() bio!: string | null;

  @Expose() avatar_url!: string | null;

  @Expose() cover_photo!: string | null;

  @Expose() country!: string | null;

  @Expose() city!: string | null;

  @Expose() role!: string;

  @Expose() is_public!: boolean;

  @Expose() favorite_genres!: string[];

  @Expose() support_link!: string | null;

  @Expose() created_at!: Date;

  @Expose() favorites_count!: number;

  @Expose() playlist_count!: number;

  @Expose() track_count!: number;

  @Expose() followings_count!: number;

  @Expose() followers_count!: number;

  @Expose() reposts_count!: number;
}
