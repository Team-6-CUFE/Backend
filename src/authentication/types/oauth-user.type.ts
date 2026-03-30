import { Gender } from '../../user/dto/create-user.dto';

export interface OAuthUser {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  birthdate: Date;
  gender: Gender;
  displayName: string;
  city: string | null;
  country: string | null;
}
