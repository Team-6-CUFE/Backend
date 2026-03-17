import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UsernameAvailabilityService } from './username-availability.service';
import { UserRepository } from './user.repository';
import { mockUserRepository } from './test/profile.mock';

describe('UsernameAvailabilityService', () => {
  let service: UsernameAvailabilityService;
  let userRepo: ReturnType<typeof mockUserRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsernameAvailabilityService,
        { provide: UserRepository, useFactory: mockUserRepository },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def: string) => def), // always return defaults
          },
        },
      ],
    }).compile();

    service = module.get(UsernameAvailabilityService);
    userRepo = module.get(UserRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('onModuleInit', () => {
    it('should seed bloom filter with all existing usernames', async () => {
      userRepo.findAllUsernames.mockResolvedValue([{ username: 'alice' }, { username: 'bob' }]);

      await service.onModuleInit();

      // alice and bob are in the filter — should be detected as "maybe taken"
      // (we verify via isUsernameTaken which will then do a DB check)
      userRepo.findByUsername.mockResolvedValue({ username: 'alice' } as any);
      const result = await service.isUsernameTaken('alice');
      expect(result).toBe(true);
    });
  });

  describe('isUsernameTaken', () => {
    it('should return false immediately if bloom filter says no (no DB call)', async () => {
      // fresh filter — nothing added, so 'newuser' is definitely not in it
      userRepo.findAllUsernames.mockResolvedValue([]);
      await service.onModuleInit();

      const result = await service.isUsernameTaken('totallyunknownxyz123');

      expect(result).toBe(false);
      expect(userRepo.findByUsername).not.toHaveBeenCalled(); // bloom filter short-circuited
    });

    it('should do DB check on bloom filter positive and return true if user exists', async () => {
      userRepo.findAllUsernames.mockResolvedValue([{ username: 'existinguser' }]);
      await service.onModuleInit();

      userRepo.findByUsername.mockResolvedValue({ username: 'existinguser' } as any);

      const result = await service.isUsernameTaken('existinguser');

      expect(result).toBe(true);
      expect(userRepo.findByUsername).toHaveBeenCalledWith('existinguser');
    });

    it('should return false if bloom filter false positive but user not in DB', async () => {
      // simulate false positive: manually add to filter but DB returns null
      service.addToFilter('ghostuser');
      userRepo.findByUsername.mockResolvedValue(null);

      const result = await service.isUsernameTaken('ghostuser');

      expect(result).toBe(false);
    });

    it('should be case-insensitive', async () => {
      service.addToFilter('CasedUser');
      userRepo.findByUsername.mockResolvedValue({ username: 'caseduser' } as any);

      const result = await service.isUsernameTaken('CasedUser');

      expect(userRepo.findByUsername).toHaveBeenCalledWith('caseduser');
      expect(result).toBe(true);
    });
  });

  describe('addToFilter', () => {
    it('should add username so subsequent checks hit the DB', async () => {
      userRepo.findAllUsernames.mockResolvedValue([]);
      await service.onModuleInit();

      service.addToFilter('brandnew');
      userRepo.findByUsername.mockResolvedValue(null);

      await service.isUsernameTaken('brandnew');

      // bloom filter now has it, so DB was consulted
      expect(userRepo.findByUsername).toHaveBeenCalled();
    });
  });
});
