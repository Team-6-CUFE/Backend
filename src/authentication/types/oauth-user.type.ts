import { Gender } from '../../user/dto/create-user.dto';

export interface OAuthUser {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  birthdate: Date;
  gender: Gender;
  display_name: string;
  city: string | null;
  country: string | null;
}
