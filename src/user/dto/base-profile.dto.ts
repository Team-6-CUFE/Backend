export class BaseProfileDataDto {
  user_id!: string;

  username!: string;

  first_name!: string;

  last_name!: string;

  display_name!: string;

  bio!: string;

  avatar_url!: string;

  cover_photo!: string;

  country!: string;

  city!: string;

  role!: string;

  is_public!: boolean;

  favorite_genres!: string[];

  support_link!: string;

  created_at!: Date;

  favorites_count!: number;

  playlist_count!: number;

  track_count!: number;

  followings_count!: number;

  followers_count!: number;

  reposts_count!: number;
}
