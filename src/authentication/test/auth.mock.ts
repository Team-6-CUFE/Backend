import { User } from '../../user/entities/user.entity';
import { UserEmail } from '../../user/entities/user-email.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { OAuthProfile } from '../types/oauth-profile.type';

export const mockUserId = 'uuid-auth-1234';
export const mockEmail = 'yara@example.com';
export const mockUsername = 'yara_senousy';
export const mockVerificationToken =
  'a3f8c2d1e4b5a6f7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1';
export const mockAccessToken = 'mock.access.token';
export const mockRefreshToken = 'mock.refresh.token';
export const mockPassword = 'SecurePassword123!';

export const mockRedisClient = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  lPush: jest.fn(),
  lTrim: jest.fn(),
  zIncrBy: jest.fn(),
  zRange: jest.fn(),
});

export const mockRegisterDto = () => ({
  email: mockEmail,
  password: mockPassword,
  displayName: 'Yara Senousy',
  birthdate: new Date('1995-06-15'),
  gender: 'female',
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
  userId: mockUserId,
  username: mockUsername,
  displayName: mockUsername,
  firstName: 'Yara',
  lastName: 'Senousy',
  passwordHash: 'hashedPassword',
  role: 'listener',
  plan: 'free',
  isSuspended: false,
  isPublic: true,
  avatarUrl: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  emails: [
    {
      email: mockEmail,
      isPrimary: true,
      isVerified: true,
      userId: mockUserId,
    } as UserEmail,
  ],
});

export const mockUserEmail = (): Partial<UserEmail> => ({
  email: mockEmail,
  userId: mockUserId,
  isPrimary: true,
  isVerified: false,
});

export const mockStoredRefreshToken = (): Partial<RefreshToken> => ({
  id: 'token-uuid-1234',
  userId: mockUserId,
  token: 'hashed_refresh_token',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
});

export const mockExpiredRefreshToken = (): Partial<RefreshToken> => ({
  id: 'token-uuid-5678',
  userId: mockUserId,
  token: 'hashed_expired_token',
  expiresAt: new Date(Date.now() - 1000), // already expired
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

export const mockProviderId = 'google-provider-id-123';
export const mockPendingToken = 'pending-token-abc123';
export const mockSecondaryEmail = 'secondary@example.com';

export const mockOAuthProfile = (): OAuthProfile => ({
  provider: 'google',
  providerId: mockProviderId,
  email: mockEmail,
  firstName: 'Yara',
  lastName: 'Senousy',
});

export const mockSocialAccount = () => ({
  provider: 'google',
  providerId: mockProviderId,
  userId: mockUserId,
});

export const mockPendingOAuthSession = () => ({
  token: mockPendingToken,
  provider: 'google',
  providerId: mockProviderId,
  email: mockEmail,
  firstName: 'Yara',
  lastName: 'Senousy',
  expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
});

export const mockExpiredPendingOAuthSession = () => ({
  ...mockPendingOAuthSession(),
  expiresAt: new Date(Date.now() - 1000), // already expired
});

export const mockCompleteOAuthProfileDto = () => ({
  pendingToken: mockPendingToken,
  displayName: 'Yara Senousy',
  birthdate: '1995-06-15',
  gender: 'female',
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
  createVerificationCode: jest.fn(),
  deleteExistingVerificationCodes: jest.fn(),
  findValidVerificationCode: jest.fn(),
  deleteVerificationCode: jest.fn(),
  findPasswordResetToken: jest.fn(),
  deleteVerificationToken: jest.fn(),
  createPendingOauthToken: jest.fn(),
  findPendingToken: jest.fn(),
  deletePendingToken: jest.fn(),
});

export const mockUserService = () => ({
  checkEmailExists: jest.fn(),
  checkUsernameExists: jest.fn(),
  createUser: jest.fn(),
  findEmailRecord: jest.fn(),
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  findById: jest.fn().mockResolvedValue(mockUser()),
  verifyPassword: jest.fn(),
  remove: jest.fn(),
  addEmail: jest.fn(),
  removeEmail: jest.fn(),
  getEmails: jest.fn(),
  setPrimaryEmail: jest.fn(),
  updatePassword: jest.fn(),
  getPrimaryEmail: jest.fn(),
  findSocialAccount: jest.fn(),
  createSocialAccount: jest.fn(),
  createOAuthUser: jest.fn(),
  deleteSocialAccount: jest.fn(),
  getSocialAccounts: jest.fn(),
});

export const mockMailService = () => ({
  sendEmailVerification: jest.fn(),
  sendWelcomeEmail: jest.fn(),
  sendEmailAddedNotification: jest.fn(),
  sendPrimaryEmailChangeCode: jest.fn(),
  sendPasswordReset: jest.fn(),
});

export const mockJwtService = () => ({
  sign: jest.fn().mockReturnValue('mocked-token'),
  verify: jest.fn(),
});

export const mockConfigService = () => ({
  get: jest.fn().mockImplementation((key: string) => {
    const config: Record<string, string> = {
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      NODE_ENV: 'test',
    };
    return config[key];
  }),
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
  handleOAuthCallback: jest.fn(),
  completeOAuthProfile: jest.fn(),
  addEmail: jest.fn(),
  removeEmail: jest.fn(),
  setPrimaryEmail: jest.fn(),
  verifyPrimaryEmailChange: jest.fn(),
  getEmails: jest.fn(),
  changePasswordRequest: jest.fn(),
  changePassword: jest.fn(),
  forgotPassword: jest.fn(),
  linkSocialAccount: jest.fn(),
  unlinkSocialAccount: jest.fn(),
  getSocialAccounts: jest.fn(),
});

export const mockVerificationCode = '123456';

export const mockUserWithMultipleEmails = (): Partial<User> => ({
  ...mockUser(),
  emails: [
    {
      email: mockEmail,
      isPrimary: true,
      isVerified: true,
      userId: mockUserId,
    } as UserEmail,
    {
      email: mockSecondaryEmail,
      isPrimary: false,
      isVerified: true,
      userId: mockUserId,
    } as UserEmail,
  ],
});

export const mockNewEmailRecord = () => ({
  email: mockSecondaryEmail,
  isPrimary: false,
  isVerified: false,
  userId: mockUserId,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const mockVerificationCodeRecord = () => ({
  id: 'code-uuid-001',
  userId: mockUserId,
  code: mockVerificationCode,
  email: mockSecondaryEmail,
  expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min from now
});

export const mockExpiredVerificationCodeRecord = () => ({
  ...mockVerificationCodeRecord(),
  expiresAt: new Date(Date.now() - 1000), // already expired
});
