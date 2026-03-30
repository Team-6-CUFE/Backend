import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { UsernameAvailabilityService } from './username-availability.service';
import { TrackService } from '../track/track.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440001';
const mockEmail = 'yara@example.com';
const mockUsername = 'yara_senousy';
const mockDisplayName = 'Yara Senousy';
const mockPasswordHash = '$2b$10$hashedpassword';

const mockUser = () => ({
  userId: mockUserId,
  email: mockEmail,
  username: mockUsername,
  passwordHash: mockPasswordHash,
  emails: [{ email: mockEmail, isPrimary: true, isVerified: true, userId: mockUserId }],
});

const mockUserEmail = () => ({
  id: 'email-001',
  email: mockEmail,
  isPrimary: true,
  isVerified: false,
  userId: mockUserId,
});

const mockCreateUserDto = () => ({
  email: mockEmail,
  password: 'SecurePassword123!',
  displayName: mockDisplayName,
  firstName: 'Yara',
  lastName: 'Senousy',
  birthdate: '1995-06-15',
  country: 'Egypt',
});

const mockSocialAccount = () => ({
  provider: 'google',
  providerId: 'google-provider-id-123',
  userId: mockUserId,
  email: mockEmail,
});

const mockOAuthUser = () => ({
  email: mockEmail,
  username: mockUsername,
  firstName: 'Yara',
  lastName: 'Senousy',
  displayName: 'Yara Senousy',
  birthdate: '1995-06-15',
  gender: 'female',
});

const mockSecondaryEmail = 'secondary@example.com';

const mockNewEmailRecord = () => ({
  email: mockSecondaryEmail,
  isPrimary: false,
  isVerified: false,
  userId: mockUserId,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const mockUserRepository = () => ({
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  findEmailRecord: jest.fn(),
  createUser: jest.fn(),
  delete: jest.fn(),
  findById: jest.fn(),
  createOAuthUser: jest.fn(),
  addEmail: jest.fn(),
  removeEmail: jest.fn(),
  getEmails: jest.fn(),
  setPrimaryEmail: jest.fn(),
  getPrimaryEmail: jest.fn(),
  updatePassword: jest.fn(),
  createSocialAccount: jest.fn(),
  findSocialAccount: jest.fn(),
  deleteSocialAccount: jest.fn(),
  getSocialAccounts: jest.fn(),
});

const mockUsernameAvailabilityService = () => ({
  isUsernameTaken: jest.fn(),
  addToFilter: jest.fn(),
});

const mockTrackService = () => ({
  getUserTrackReposts: jest.fn(),
});

describe('UserService', () => {
  let service: UserService;
  let userRepo: ReturnType<typeof mockUserRepository>;
  let usernameAvailability: ReturnType<typeof mockUsernameAvailabilityService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useFactory: mockUserRepository },
        { provide: UsernameAvailabilityService, useFactory: mockUsernameAvailabilityService },
        { provide: TrackService, useFactory: mockTrackService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepo = module.get(UserRepository);
    usernameAvailability = module.get(UsernameAvailabilityService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('checkEmailExists', () => {
    it('should return true if user with email exists', async () => {
      userRepo.findByEmail.mockResolvedValue(mockUser());

      const result = await service.checkEmailExists(mockEmail);

      expect(result).toBe(true);
    });

    it('should return false if no user with email exists', async () => {
      userRepo.findByEmail.mockResolvedValue(null);

      const result = await service.checkEmailExists(mockEmail);

      expect(result).toBe(false);
    });

    it('should call findByEmail with the correct email', async () => {
      userRepo.findByEmail.mockResolvedValue(null);

      await service.checkEmailExists(mockEmail);

      expect(userRepo.findByEmail).toHaveBeenCalledWith(mockEmail);
      expect(userRepo.findByEmail).toHaveBeenCalledTimes(1);
    });

    it('should propagate error if repository throws', async () => {
      userRepo.findByEmail.mockRejectedValue(new Error('DB error'));

      await expect(service.checkEmailExists(mockEmail)).rejects.toThrow('DB error');
    });
  });

  describe('checkUsernameExists', () => {
    it('should return true if username is taken', async () => {
      usernameAvailability.isUsernameTaken.mockResolvedValue(true);

      const result = await service.checkUsernameExists(mockUsername);

      expect(result).toBe(true);
    });

    it('should return false if username is available', async () => {
      usernameAvailability.isUsernameTaken.mockResolvedValue(false);

      const result = await service.checkUsernameExists(mockUsername);

      expect(result).toBe(false);
    });

    it('should call isUsernameTaken with the correct username', async () => {
      usernameAvailability.isUsernameTaken.mockResolvedValue(false);

      await service.checkUsernameExists(mockUsername);

      expect(usernameAvailability.isUsernameTaken).toHaveBeenCalledWith(mockUsername);
      expect(usernameAvailability.isUsernameTaken).toHaveBeenCalledTimes(1);
    });
  });

  describe('hashPassword', () => {
    it('should return a string different from the original password', async () => {
      const result = await service.hashPassword('SecurePassword123!');

      expect(result).not.toBe('SecurePassword123!');
      expect(typeof result).toBe('string');
    });

    it('should return a valid bcrypt hash (starts with $2b$)', async () => {
      const result = await service.hashPassword('SecurePassword123!');

      expect(result).toMatch(/^\$2b\$10\$/);
    });

    it('should produce different hashes for the same password (salt is random)', async () => {
      const hash1 = await service.hashPassword('SecurePassword123!');
      const hash2 = await service.hashPassword('SecurePassword123!');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce a hash that bcrypt can verify', async () => {
      const hash = await service.hashPassword('SecurePassword123!');
      const isValid = await bcrypt.compare('SecurePassword123!', hash);

      expect(isValid).toBe(true);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for a matching password and hash', async () => {
      const hash = await bcrypt.hash('SecurePassword123!', 10);

      const result = await service.verifyPassword('SecurePassword123!', hash);

      expect(result).toBe(true);
    });

    it('should return false for a wrong password', async () => {
      const hash = await bcrypt.hash('SecurePassword123!', 10);

      const result = await service.verifyPassword('WrongPassword!', hash);

      expect(result).toBe(false);
    });

    it('should return false for an empty password', async () => {
      const hash = await bcrypt.hash('SecurePassword123!', 10);

      const result = await service.verifyPassword('', hash);

      expect(result).toBe(false);
    });

    it('should return false for a password that is close but not identical', async () => {
      const hash = await bcrypt.hash('SecurePassword123!', 10);

      const result = await service.verifyPassword('SecurePassword123', hash); // missing !

      expect(result).toBe(false);
    });
  });

  describe('createUser', () => {
    beforeEach(() => {
      userRepo.createUser.mockResolvedValue(mockUser());
    });

    it('should call createUser on repository and return the result', async () => {
      const result = await service.createUser(
        mockCreateUserDto() as any,
        mockUsername,
        'Cairo',
        'EG'
      );

      expect(userRepo.createUser).toHaveBeenCalledTimes(1);
      expect(result.userId).toBe(mockUserId);
    });

    it('should not pass raw password to repository', async () => {
      await service.createUser(mockCreateUserDto() as any, mockUsername, 'Cairo', 'EG');

      const [, hashedPassword] = userRepo.createUser.mock.calls[0];
      expect(hashedPassword).not.toBe('SecurePassword123!');
    });

    it('should pass a valid bcrypt hash to repository', async () => {
      await service.createUser(mockCreateUserDto() as any, mockUsername, 'Cairo', 'EG');

      const [, hashedPassword] = userRepo.createUser.mock.calls[0];
      expect(hashedPassword).toMatch(/^\$2b\$10\$/);
    });

    it('should pass city and country to repository', async () => {
      await service.createUser(mockCreateUserDto() as any, mockUsername, 'Cairo', 'EG');

      const [, , usernameArg, cityArg, countryArg] = userRepo.createUser.mock.calls[0];
      expect(usernameArg).toBe(mockUsername);
      expect(cityArg).toBe('Cairo');
      expect(countryArg).toBe('EG');
    });

    it('should pass null city and country to repository when not detected', async () => {
      await service.createUser(mockCreateUserDto() as any, mockUsername, null, null);

      const [, , , cityArg, countryArg] = userRepo.createUser.mock.calls[0];
      expect(cityArg).toBeNull();
      expect(countryArg).toBeNull();
    });

    it('should call addToFilter with the username after creating user', async () => {
      await service.createUser(mockCreateUserDto() as any, mockUsername, 'Cairo', 'EG');

      expect(usernameAvailability.addToFilter).toHaveBeenCalledWith(mockUsername);
      expect(usernameAvailability.addToFilter).toHaveBeenCalledTimes(1);
    });

    it('should call addToFilter before calling repository createUser', async () => {
      const callOrder: string[] = [];
      usernameAvailability.addToFilter.mockImplementation(() => {
        callOrder.push('addToFilter');
      });
      userRepo.createUser.mockImplementation(async () => {
        callOrder.push('createUser');
        return mockUser();
      });

      await service.createUser(mockCreateUserDto() as any, mockUsername, 'Cairo', 'EG');

      expect(callOrder[0]).toBe('addToFilter');
      expect(callOrder[1]).toBe('createUser');
    });

    it('should propagate error if repository createUser fails', async () => {
      userRepo.createUser.mockRejectedValue(new Error('DB error'));

      await expect(
        service.createUser(mockCreateUserDto() as any, mockUsername, 'Cairo', 'EG')
      ).rejects.toThrow('DB error');
    });
  });

  describe('findByEmail', () => {
    it('should return user if found', async () => {
      userRepo.findByEmail.mockResolvedValue(mockUser());

      const result = await service.findByEmail(mockEmail);

      expect(result).toEqual(mockUser());
    });

    it('should return null if user not found', async () => {
      userRepo.findByEmail.mockResolvedValue(null);

      const result = await service.findByEmail(mockEmail);

      expect(result).toBeNull();
    });

    it('should call findByEmail with correct email', async () => {
      userRepo.findByEmail.mockResolvedValue(null);

      await service.findByEmail(mockEmail);

      expect(userRepo.findByEmail).toHaveBeenCalledWith(mockEmail);
    });
  });

  describe('findByUsername', () => {
    it('should return user if found', async () => {
      userRepo.findByUsername.mockResolvedValue(mockUser());

      const result = await service.findByUsername(mockUsername);

      expect(result).toEqual(mockUser());
    });

    it('should return null if user not found', async () => {
      userRepo.findByUsername.mockResolvedValue(null);

      const result = await service.findByUsername(mockUsername);

      expect(result).toBeNull();
    });

    it('should call findByUsername with correct username', async () => {
      userRepo.findByUsername.mockResolvedValue(null);

      await service.findByUsername(mockUsername);

      expect(userRepo.findByUsername).toHaveBeenCalledWith(mockUsername);
    });
  });

  describe('findEmailRecord', () => {
    it('should return email record if found', async () => {
      userRepo.findEmailRecord.mockResolvedValue(mockUserEmail());

      const result = await service.findEmailRecord(mockEmail);

      expect(result).toEqual(mockUserEmail());
    });

    it('should return null if email record not found', async () => {
      userRepo.findEmailRecord.mockResolvedValue(null);

      const result = await service.findEmailRecord(mockEmail);

      expect(result).toBeNull();
    });

    it('should call findEmailRecord with correct email', async () => {
      userRepo.findEmailRecord.mockResolvedValue(null);

      await service.findEmailRecord(mockEmail);

      expect(userRepo.findEmailRecord).toHaveBeenCalledWith(mockEmail);
    });
  });

  describe('remove', () => {
    it('should call repository delete with correct id', async () => {
      userRepo.delete.mockResolvedValue(undefined);

      await service.remove(mockUserId);

      expect(userRepo.delete).toHaveBeenCalledWith(mockUserId);
      expect(userRepo.delete).toHaveBeenCalledTimes(1);
    });

    it('should propagate error if repository delete fails', async () => {
      userRepo.delete.mockRejectedValue(new Error('DB error'));

      await expect(service.remove(mockUserId)).rejects.toThrow('DB error');
    });
  });

  describe('findById', () => {
    it('should return user if found', async () => {
      userRepo.findById.mockResolvedValue(mockUser());

      const result = await service.findById(mockUserId);

      expect(result).toEqual(mockUser());
    });

    it('should return null if user not found', async () => {
      userRepo.findById.mockResolvedValue(null);

      const result = await service.findById(mockUserId);

      expect(result).toBeNull();
    });

    it('should call findById with correct id', async () => {
      userRepo.findById.mockResolvedValue(null);

      await service.findById(mockUserId);

      expect(userRepo.findById).toHaveBeenCalledWith(mockUserId);
      expect(userRepo.findById).toHaveBeenCalledTimes(1);
    });

    it('should propagate error if repository throws', async () => {
      userRepo.findById.mockRejectedValue(new Error('DB error'));

      await expect(service.findById(mockUserId)).rejects.toThrow('DB error');
    });
  });

  describe('createOAuthUser', () => {
    beforeEach(() => {
      userRepo.createOAuthUser.mockResolvedValue(mockUser());
    });

    it('should call createOAuthUser on repository and return result', async () => {
      const result = await service.createOAuthUser(mockOAuthUser() as any);

      expect(userRepo.createOAuthUser).toHaveBeenCalledTimes(1);
      expect(result.userId).toBe(mockUserId);
    });

    it('should call addToFilter with the username', async () => {
      await service.createOAuthUser(mockOAuthUser() as any);

      expect(usernameAvailability.addToFilter).toHaveBeenCalledWith(mockUsername);
      expect(usernameAvailability.addToFilter).toHaveBeenCalledTimes(1);
    });

    it('should call addToFilter before calling repository createOAuthUser', async () => {
      const callOrder: string[] = [];
      usernameAvailability.addToFilter.mockImplementation(() => {
        callOrder.push('addToFilter');
      });
      userRepo.createOAuthUser.mockImplementation(async () => {
        callOrder.push('createOAuthUser');
        return mockUser();
      });

      await service.createOAuthUser(mockOAuthUser() as any);

      expect(callOrder[0]).toBe('addToFilter');
      expect(callOrder[1]).toBe('createOAuthUser');
    });

    it('should pass the full OAuth user object to repository', async () => {
      await service.createOAuthUser(mockOAuthUser() as any);

      expect(userRepo.createOAuthUser).toHaveBeenCalledWith(mockOAuthUser());
    });

    it('should propagate error if repository throws', async () => {
      userRepo.createOAuthUser.mockRejectedValue(new Error('DB error'));

      await expect(service.createOAuthUser(mockOAuthUser() as any)).rejects.toThrow('DB error');
    });
  });

  describe('addEmail', () => {
    it('should call addEmail on repository with correct args', async () => {
      userRepo.addEmail.mockResolvedValue(mockNewEmailRecord());

      await service.addEmail(mockUserId, mockSecondaryEmail);

      expect(userRepo.addEmail).toHaveBeenCalledWith(mockUserId, mockSecondaryEmail);
      expect(userRepo.addEmail).toHaveBeenCalledTimes(1);
    });

    it('should return the new email record', async () => {
      userRepo.addEmail.mockResolvedValue(mockNewEmailRecord());

      const result = await service.addEmail(mockUserId, mockSecondaryEmail);

      expect(result.email).toBe(mockSecondaryEmail);
      expect(result.isPrimary).toBe(false);
      expect(result.isVerified).toBe(false);
    });

    it('should propagate error if repository throws', async () => {
      userRepo.addEmail.mockRejectedValue(new Error('DB error'));

      await expect(service.addEmail(mockUserId, mockSecondaryEmail)).rejects.toThrow('DB error');
    });
  });

  describe('removeEmail', () => {
    it('should call removeEmail on repository with correct args', async () => {
      userRepo.removeEmail.mockResolvedValue(undefined);

      await service.removeEmail(mockUserId, mockSecondaryEmail);

      expect(userRepo.removeEmail).toHaveBeenCalledWith(mockUserId, mockSecondaryEmail);
      expect(userRepo.removeEmail).toHaveBeenCalledTimes(1);
    });

    it('should propagate error if repository throws', async () => {
      userRepo.removeEmail.mockRejectedValue(new Error('DB error'));

      await expect(service.removeEmail(mockUserId, mockSecondaryEmail)).rejects.toThrow('DB error');
    });
  });

  describe('getEmails', () => {
    it('should call getEmails on repository with correct userId', async () => {
      userRepo.getEmails.mockResolvedValue([mockUserEmail()]);

      await service.getEmails(mockUserId);

      expect(userRepo.getEmails).toHaveBeenCalledWith(mockUserId);
      expect(userRepo.getEmails).toHaveBeenCalledTimes(1);
    });

    it('should return array of emails', async () => {
      userRepo.getEmails.mockResolvedValue([mockUserEmail()]);

      const result = await service.getEmails(mockUserId);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0].email).toBe(mockEmail);
    });

    it('should return empty array if user has no emails', async () => {
      userRepo.getEmails.mockResolvedValue([]);

      const result = await service.getEmails(mockUserId);

      expect(result).toEqual([]);
    });

    it('should propagate error if repository throws', async () => {
      userRepo.getEmails.mockRejectedValue(new Error('DB error'));

      await expect(service.getEmails(mockUserId)).rejects.toThrow('DB error');
    });
  });

  describe('setPrimaryEmail', () => {
    it('should call setPrimaryEmail on repository with correct args', async () => {
      userRepo.setPrimaryEmail.mockResolvedValue(undefined);

      await service.setPrimaryEmail(mockUserId, mockSecondaryEmail);

      expect(userRepo.setPrimaryEmail).toHaveBeenCalledWith(mockUserId, mockSecondaryEmail);
      expect(userRepo.setPrimaryEmail).toHaveBeenCalledTimes(1);
    });

    it('should propagate error if repository throws', async () => {
      userRepo.setPrimaryEmail.mockRejectedValue(new Error('DB error'));

      await expect(service.setPrimaryEmail(mockUserId, mockSecondaryEmail)).rejects.toThrow(
        'DB error'
      );
    });
  });

  describe('getPrimaryEmail', () => {
    it('should return primary email if found', async () => {
      userRepo.getPrimaryEmail.mockResolvedValue(mockEmail);

      const result = await service.getPrimaryEmail(mockUserId);

      expect(result).toBe(mockEmail);
    });

    it('should return null if no primary email found', async () => {
      userRepo.getPrimaryEmail.mockResolvedValue(null);

      const result = await service.getPrimaryEmail(mockUserId);

      expect(result).toBeNull();
    });

    it('should call getPrimaryEmail with correct userId', async () => {
      userRepo.getPrimaryEmail.mockResolvedValue(mockEmail);

      await service.getPrimaryEmail(mockUserId);

      expect(userRepo.getPrimaryEmail).toHaveBeenCalledWith(mockUserId);
      expect(userRepo.getPrimaryEmail).toHaveBeenCalledTimes(1);
    });

    it('should propagate error if repository throws', async () => {
      userRepo.getPrimaryEmail.mockRejectedValue(new Error('DB error'));

      await expect(service.getPrimaryEmail(mockUserId)).rejects.toThrow('DB error');
    });
  });

  describe('updatePassword', () => {
    it('should call updatePassword on repository with hashed password not raw', async () => {
      userRepo.updatePassword.mockResolvedValue(undefined);

      await service.updatePassword(mockUserId, 'NewPassword123!');

      const [calledUserId, calledHash] = userRepo.updatePassword.mock.calls[0];
      expect(calledUserId).toBe(mockUserId);
      expect(calledHash).not.toBe('NewPassword123!');
      expect(calledHash).toMatch(/^\$2b\$10\$/);
    });

    it('should call updatePassword with correct userId', async () => {
      userRepo.updatePassword.mockResolvedValue(undefined);

      await service.updatePassword(mockUserId, 'NewPassword123!');

      expect(userRepo.updatePassword).toHaveBeenCalledTimes(1);
      expect(userRepo.updatePassword.mock.calls[0][0]).toBe(mockUserId);
    });

    it('should hash the password before passing to repository', async () => {
      userRepo.updatePassword.mockResolvedValue(undefined);

      await service.updatePassword(mockUserId, 'NewPassword123!');

      const [, hashedPassword] = userRepo.updatePassword.mock.calls[0];
      const isValid = await bcrypt.compare('NewPassword123!', hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should propagate error if repository throws', async () => {
      userRepo.updatePassword.mockRejectedValue(new Error('DB error'));

      await expect(service.updatePassword(mockUserId, 'NewPassword123!')).rejects.toThrow(
        'DB error'
      );
    });
  });

  describe('createSocialAccount', () => {
    it('should call createSocialAccount on repository with correct args', async () => {
      userRepo.createSocialAccount.mockResolvedValue(mockSocialAccount());

      await service.createSocialAccount(mockUserId, 'google', 'provider-id-123', mockEmail);

      expect(userRepo.createSocialAccount).toHaveBeenCalledWith(
        mockUserId,
        'google',
        'provider-id-123',
        mockEmail
      );
      expect(userRepo.createSocialAccount).toHaveBeenCalledTimes(1);
    });

    it('should return the created social account', async () => {
      userRepo.createSocialAccount.mockResolvedValue(mockSocialAccount());

      const result = await service.createSocialAccount(
        mockUserId,
        'google',
        'provider-id-123',
        mockEmail
      );

      expect(result.provider).toBe('google');
      expect(result.userId).toBe(mockUserId);
    });

    it('should propagate error if repository throws', async () => {
      userRepo.createSocialAccount.mockRejectedValue(new Error('DB error'));

      await expect(
        service.createSocialAccount(mockUserId, 'google', 'provider-id-123', mockEmail)
      ).rejects.toThrow('DB error');
    });
  });

  describe('findSocialAccount', () => {
    it('should return social account if found', async () => {
      userRepo.findSocialAccount.mockResolvedValue(mockSocialAccount());

      const result = await service.findSocialAccount('google', 'provider-id-123');

      expect(result).toEqual(mockSocialAccount());
    });

    it('should return null if social account not found', async () => {
      userRepo.findSocialAccount.mockResolvedValue(null);

      const result = await service.findSocialAccount('google', 'provider-id-123');

      expect(result).toBeNull();
    });

    it('should call findSocialAccount with correct args', async () => {
      userRepo.findSocialAccount.mockResolvedValue(null);

      await service.findSocialAccount('google', 'provider-id-123');

      expect(userRepo.findSocialAccount).toHaveBeenCalledWith('google', 'provider-id-123');
      expect(userRepo.findSocialAccount).toHaveBeenCalledTimes(1);
    });

    it('should propagate error if repository throws', async () => {
      userRepo.findSocialAccount.mockRejectedValue(new Error('DB error'));

      await expect(service.findSocialAccount('google', 'provider-id-123')).rejects.toThrow(
        'DB error'
      );
    });
  });

  describe('deleteSocialAccount', () => {
    it('should call deleteSocialAccount on repository with correct args', async () => {
      userRepo.deleteSocialAccount.mockResolvedValue(undefined);

      await service.deleteSocialAccount('google', 'provider-id-123');

      expect(userRepo.deleteSocialAccount).toHaveBeenCalledWith('google', 'provider-id-123');
      expect(userRepo.deleteSocialAccount).toHaveBeenCalledTimes(1);
    });

    it('should propagate error if repository throws', async () => {
      userRepo.deleteSocialAccount.mockRejectedValue(new Error('DB error'));

      await expect(service.deleteSocialAccount('google', 'provider-id-123')).rejects.toThrow(
        'DB error'
      );
    });
  });

  describe('getSocialAccounts', () => {
    it('should call getSocialAccounts on repository with correct userId', async () => {
      userRepo.getSocialAccounts.mockResolvedValue([mockSocialAccount()]);

      await service.getSocialAccounts(mockUserId);

      expect(userRepo.getSocialAccounts).toHaveBeenCalledWith(mockUserId);
      expect(userRepo.getSocialAccounts).toHaveBeenCalledTimes(1);
    });

    it('should return array of social accounts', async () => {
      userRepo.getSocialAccounts.mockResolvedValue([mockSocialAccount()]);

      const result = await service.getSocialAccounts(mockUserId);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0].provider).toBe('google');
      expect(result[0].userId).toBe(mockUserId);
    });

    it('should return empty array if user has no social accounts', async () => {
      userRepo.getSocialAccounts.mockResolvedValue([]);

      const result = await service.getSocialAccounts(mockUserId);

      expect(result).toEqual([]);
    });

    it('should propagate error if repository throws', async () => {
      userRepo.getSocialAccounts.mockRejectedValue(new Error('DB error'));

      await expect(service.getSocialAccounts(mockUserId)).rejects.toThrow('DB error');
    });
  });
});
