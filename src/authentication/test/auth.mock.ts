import { User } from '../../user/entities/user.entity';
import { UserEmail } from '../../user/entities/user-email.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

export const mockUserId = 'uuid-auth-1234';
export const mockEmail = 'yara@example.com';
export const mockUsername = 'yara_senousy';
export const mockVerificationToken =
  'a3f8c2d1e4b5a6f7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1';
export const mockAccessToken = 'mock.access.token';
export const mockRefreshToken = 'mock.refresh.token';
export const mockPassword = 'SecurePassword123!';

export const mockRegisterDto = () => ({
  email: mockEmail,
  password: mockPassword,
  username: mockUsername,
  first_name: 'Yara',
  last_name: 'Senousy',
  birthdate: new Date('1995-06-15'),
  gender: 'female',
  country: 'Egypt',
  captchaToken: 'valid-captcha-token',
});

export const mockLoginDto = () => ({
  identifier: mockEmail,
  password: mockPassword,
});

export const mockLoginDtoWithUsername = () => ({
  identifier: mockUsername,
  password: mockPassword,
});

export const mockUser = (): Partial<User> => ({
  user_id: mockUserId,
  username: mockUsername,
  display_name: mockUsername,
  first_name: 'Yara',
  last_name: 'Senousy',
  password_hash: 'hashed_password',
  role: 'listener',
  plan: 'free',
  is_suspended: false,
  is_public: true,
  avatar_url: '',
  created_at: new Date(),
  updated_at: new Date(),
  emails: [
    {
      email: mockEmail,
      is_primary: true,
      is_verified: true,
      user_id: mockUserId,
    } as UserEmail,
  ],
});

export const mockUserEmail = (): Partial<UserEmail> => ({
  email: mockEmail,
  user_id: mockUserId,
  is_primary: true,
  is_verified: false,
});

export const mockStoredRefreshToken = (): Partial<RefreshToken> => ({
  id: 'token-uuid-1234',
  user_id: mockUserId,
  token: 'hashed_refresh_token',
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
});

export const mockExpiredRefreshToken = (): Partial<RefreshToken> => ({
  id: 'token-uuid-5678',
  user_id: mockUserId,
  token: 'hashed_expired_token',
  expires_at: new Date(Date.now() - 1000), // already expired
});

export const mockResponseWithCookie = () => ({
  cookie: jest.fn(),
  clearCookie: jest.fn(),
});

export const mockRequest = (refreshToken?: string) => ({
  cookies: {
    refresh_token: refreshToken ?? mockRefreshToken,
  },
});

// Service / Repository

export const mockAuthenticationRepository = () => ({
  createVerificationToken: jest.fn(),
  findVerificationToken: jest.fn(),
  deleteExistingTokens: jest.fn(),
  countRecentVerificationTokens: jest.fn(),
  verifyEmail: jest.fn(),
  saveRefreshToken: jest.fn(),
  findValidRefreshToken: jest.fn(),
  revokeRefreshToken: jest.fn(),
  revokeAllForUser: jest.fn(),
});

export const mockUserService = () => ({
  checkEmailExists: jest.fn(),
  checkUsernameExists: jest.fn(),
  createUser: jest.fn(),
  findEmailRecord: jest.fn(),
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  verifyPassword: jest.fn(),
  remove: jest.fn(),
});

export const mockMailService = () => ({
  sendEmailVerification: jest.fn(),
  sendWelcomeEmail: jest.fn(),
});

export const mockJwtService = () => ({
  sign: jest.fn(),
});

export const mockConfigService = () => ({
  get: jest.fn(),
});

export const mockAuthenticationService = () => ({
  register: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerificationEmail: jest.fn(),
  testEmail: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  refreshTokens: jest.fn(),
  removeUser: jest.fn(),
});
