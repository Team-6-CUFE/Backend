import { User } from '../../user/entities/user.entity';
import { UserEmail } from '../../user/entities/user-email.entity';

// ─── Reusable mock data ───────────────────────────────────────────────────────

export const mockUserId = 'uuid-auth-1234';
export const mockEmail = 'yara@example.com';
export const mockUsername = 'yara_senousy';
export const mockVerificationToken =
  'a3f8c2d1e4b5a6f7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1';

export const mockRegisterDto = () => ({
  email: mockEmail,
  password: 'SecurePassword123!',
  username: mockUsername,
  first_name: 'Yara',
  last_name: 'Senousy',
  birthdate: new Date('1995-06-15'),
  gender: 'female',
  country: 'Egypt',
  captchaToken: 'valid-captcha-token',
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

// ─── Mock providers ───────────────────────────────────────────────────────────

export const mockAuthenticationRepository = () => ({
  createVerificationToken: jest.fn(),
  findVerificationToken: jest.fn(),
  deleteExistingTokens: jest.fn(),
  countRecentVerificationTokens: jest.fn(),
  verifyEmail: jest.fn(),
});

export const mockUserService = () => ({
  checkEmailExists: jest.fn(),
  checkUsernameExists: jest.fn(),
  createUser: jest.fn(),
  findEmailRecord: jest.fn(),
  findByEmail: jest.fn(),
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
});
