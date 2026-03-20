import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { UsernameAvailabilityService } from './username-availability.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440001';
const mockEmail = 'yara@example.com';
const mockUsername = 'yara_senousy';
const mockDisplayName = 'Yara Senousy';
const mockPasswordHash = '$2b$10$hashedpassword';

const mockUser = () => ({
  user_id: mockUserId,
  email: mockEmail,
  username: mockUsername,
  password_hash: mockPasswordHash,
  emails: [{ email: mockEmail, is_primary: true, is_verified: true, user_id: mockUserId }],
});

const mockUserEmail = () => ({
  id: 'email-001',
  email: mockEmail,
  is_primary: true,
  is_verified: false,
  user_id: mockUserId,
});

const mockCreateUserDto = () => ({
  email: mockEmail,
  password: 'SecurePassword123!',
  display_name: mockDisplayName,
  first_name: 'Yara',
  last_name: 'Senousy',
  birthdate: '1995-06-15',
  country: 'Egypt',
});

const mockUserRepository = () => ({
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  findEmailRecord: jest.fn(),
  createUser: jest.fn(),
  delete: jest.fn(),
});

const mockUsernameAvailabilityService = () => ({
  isUsernameTaken: jest.fn(),
  addToFilter: jest.fn(),
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

  describe('hash_password', () => {
    it('should return a string different from the original password', async () => {
      const result = await service.hash_password('SecurePassword123!');

      expect(result).not.toBe('SecurePassword123!');
      expect(typeof result).toBe('string');
    });

    it('should return a valid bcrypt hash (starts with $2b$)', async () => {
      const result = await service.hash_password('SecurePassword123!');

      expect(result).toMatch(/^\$2b\$10\$/);
    });

    it('should produce different hashes for the same password (salt is random)', async () => {
      const hash1 = await service.hash_password('SecurePassword123!');
      const hash2 = await service.hash_password('SecurePassword123!');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce a hash that bcrypt can verify', async () => {
      const hash = await service.hash_password('SecurePassword123!');
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
      const result = await service.createUser(mockCreateUserDto() as any, mockUsername);

      expect(userRepo.createUser).toHaveBeenCalledTimes(1);
      expect(result.user_id).toBe(mockUserId);
    });

    it('should not pass raw password to repository', async () => {
      await service.createUser(mockCreateUserDto() as any, mockUsername);

      const [, hashedPassword] = userRepo.createUser.mock.calls[0];
      expect(hashedPassword).not.toBe('SecurePassword123!');
    });

    it('should pass a valid bcrypt hash to repository', async () => {
      await service.createUser(mockCreateUserDto() as any, mockUsername);

      const [, hashedPassword] = userRepo.createUser.mock.calls[0];
      expect(hashedPassword).toMatch(/^\$2b\$10\$/);
    });

    it('should call addToFilter with the username after creating user', async () => {
      await service.createUser(mockCreateUserDto() as any, mockUsername);

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

      await service.createUser(mockCreateUserDto() as any, mockUsername);

      expect(callOrder[0]).toBe('addToFilter');
      expect(callOrder[1]).toBe('createUser');
    });

    it('should propagate error if repository createUser fails', async () => {
      userRepo.createUser.mockRejectedValue(new Error('DB error'));

      await expect(service.createUser(mockCreateUserDto() as any, mockUsername)).rejects.toThrow(
        'DB error'
      );
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
});
