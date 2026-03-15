export class UpdateProfileResDto {
  user_id!: string;

  username!: string;

  first_name?: string | null;

  last_name?: string | null;

  display_name?: string | null;

  bio?: string | null;

  country?: string | null;

  city?: string | null;

  gender?: string | null;

  favorite_genres!: string[];

  support_link?: string | null;

  is_public!: boolean;

  updated_at!: Date;
}
