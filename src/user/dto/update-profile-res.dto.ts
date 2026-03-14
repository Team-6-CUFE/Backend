export class UpdateProfileResDto {
  status!: string;

  message!: string;

  data!: {
    user_id: string;
    username: string;
    first_name: string;
    last_name: string;
    display_name: string;
    bio: string;
    country: string;
    city: string;
    gender: string;
    favorite_genres: string[];
    support_link: string;
    is_public: boolean;
    updated_at: Date;
  };
}
