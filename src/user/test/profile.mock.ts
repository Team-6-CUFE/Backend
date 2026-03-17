import { UserCounts } from '../types/user-counts.type';
import { User } from '../entities/user.entity';

// ─── Reusable mock data ───────────────────────────────────────────────────────

export const mockUserId = 'uuid-1234';
export const mockUsername = 'johndoe';

export const mockUser = (): Partial<User> => ({
  user_id: mockUserId,
  username: mockUsername,
  first_name: 'John',
  last_name: 'Doe',
  display_name: 'John Doe',
  bio: 'A test user',
  //   avatar_url: null,
  //   cover_photo: null,
  country: 'EG',
  city: 'Cairo',
  role: 'listener',
  is_public: true,
  gender: 'male',
  birthdate: new Date('1998-01-01'),
  plan: 'free',
  //   support_link: null,
  updated_at: new Date(),
  created_at: new Date(),
  emails: [{ email: 'john@example.com', is_primary: true, is_verified: true } as any],
  favorite_genres: [{ genre: { name: 'Rock' } } as any],
  external_profiles: [],
  social_accounts: [],
});

export const mockUserCounts = (): UserCounts => ({
  favorites_count: 5,
  playlist_count: 2,
  track_count: 10,
  followings_count: 3,
  followers_count: 7,
  reposts_count: 1,
});

// ─── Mock providers ───────────────────────────────────────────────────────────

export const mockUserRepository = () => ({
  findById: jest.fn(),
  findByUsername: jest.fn(),
  findAllUsernames: jest.fn(),
  update: jest.fn(),
  updateFavoriteGenres: jest.fn(),
  getUserCounts: jest.fn(),
});

export const mockGenreRepository = () => ({
  findByNames: jest.fn(),
});

export const mockUsernameAvailabilityService = () => ({
  isUsernameTaken: jest.fn(),
  addToFilter: jest.fn(),
});

export const mockProfileService = () => ({
  findMyProfile: jest.fn(),
  findProfile: jest.fn(),
  updateProfile: jest.fn(),
  updateMyBirthdate: jest.fn(),
  updateMyGender: jest.fn(),
  updateMyPrivacy: jest.fn(),
  isUsernameTaken: jest.fn(),
});
