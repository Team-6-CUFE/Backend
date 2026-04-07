import { UserCounts } from '../types/user-counts.type';
import { User } from '../entities/user.entity';

export const mockUserId = 'uuid-1234';
export const mockUsername = 'johndoe';

export const mockUser = (): Partial<User> => ({
  userId: mockUserId,
  username: mockUsername,
  firstName: 'John',
  lastName: 'Doe',
  displayName: 'John Doe',
  bio: 'A test user',
  avatarUrl: '',
  coverPhoto: undefined,
  country: 'EG',
  city: 'Cairo',
  role: 'listener',
  isPublic: true,
  gender: 'male',
  birthdate: new Date('1998-01-01'),
  plan: 'free',
  supportLink: '',
  updatedAt: new Date(),
  createdAt: new Date(),
  emails: [{ email: 'john@example.com', isPrimary: true, isVerified: true } as any],
  favoriteGenres: [{ genre: { name: 'Rock' } } as any],
  externalProfiles: [],
  socialAccounts: [],
});

export const mockUserCounts = (): UserCounts => ({
  favoritesCount: 5,
  playlistCount: 2,
  trackCount: 10,
  followingsCount: 3,
  followersCount: 7,
  repostsCount: 1,
});

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

export const mockExternalProfileRepository = () => ({
  findByUserId: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
});

export const mockProfileService = () => ({
  findMyProfile: jest.fn(),
  findProfile: jest.fn(),
  updateProfile: jest.fn(),
  updateMyBirthdate: jest.fn(),
  updateMyGender: jest.fn(),
  updateMyPrivacy: jest.fn(),
  isUsernameTaken: jest.fn(),
  getMyExternalProfiles: jest.fn(),
  addExternalProfile: jest.fn(),
  updateExternalProfile: jest.fn(),
  deleteExternalProfile: jest.fn(),
  updateAvatar: jest.fn(),
  updateCover: jest.fn(),
  getRecentlyPlayed: jest.fn(),
  getListeningHistory: jest.fn(),
  deleteUserHistory: jest.fn(),
});

export const mockUserTrackRepository = () => ({
  findByUser: jest.fn(),
  getListeningHistory: jest.fn(),
  deleteUserHistory: jest.fn(),
});
