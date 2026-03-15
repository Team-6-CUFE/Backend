export class BaseProfileDataDto {
  user_id!: string;

  username!: string;

  first_name!: string | null;

  last_name!: string | null;

  display_name!: string | null;

  bio!: string | null;

  avatar_url!: string | null;

  cover_photo!: string | null;

  country!: string | null;

  city!: string | null;

  role!: string;

  is_public!: boolean;

  favorite_genres!: string[];

  support_link!: string | null;

  created_at!: Date;

  // derived fields
  favorites_count!: number;

  playlist_count!: number;

  track_count!: number;

  followings_count!: number;

  followers_count!: number;

  reposts_count!: number;
}
