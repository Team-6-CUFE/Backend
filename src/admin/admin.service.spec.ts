import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { UserService } from '../user/user.service';

describe('AdminService', () => {
  let service: AdminService;
  let adminRepository: jest.Mocked<AdminRepository>;
  let userService: jest.Mocked<UserService>;

  const mockUser = { id: 'user-123', username: 'testuser' };

  beforeEach(async () => {
    // Create mock providers
    const mockAdminRepository = {
      findAllUsers: jest.fn(),
      updateUserSuspensionStatus: jest.fn(),
    };

    const mockUserService = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: AdminRepository, useValue: mockAdminRepository },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    adminRepository = module.get(AdminRepository);
    userService = module.get(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return a list of users and the total count', async () => {
      const limit = 20;
      const offset = 0;
      const search = 'test';
      const mockUsers = [mockUser];
      const total = 1;

      adminRepository.findAllUsers.mockResolvedValue([mockUsers as any, total]);

      const result = await service.getUsers(limit, offset, search);

      expect(adminRepository.findAllUsers).toHaveBeenCalledWith(limit, offset, search);
      expect(result).toEqual({ users: mockUsers, total });
    });
  });

  describe('suspendUser', () => {
    it('should suspend a user successfully', async () => {
      const userId = 'user-123';
      const reason = 'Spamming';

      userService.findById.mockResolvedValue(mockUser as any);
      adminRepository.updateUserSuspensionStatus.mockResolvedValue(undefined);

      await service.suspendUser(userId, reason);

      expect(userService.findById).toHaveBeenCalledWith(userId);
      expect(adminRepository.updateUserSuspensionStatus).toHaveBeenCalledWith(userId, true, reason);
    });

    it('should throw NotFoundException if user to suspend is not found', async () => {
      const userId = 'non-existent-user';
      const reason = 'Spamming';

      userService.findById.mockResolvedValue(null);

      await expect(service.suspendUser(userId, reason)).rejects.toThrow(NotFoundException);
      expect(userService.findById).toHaveBeenCalledWith(userId);
      expect(adminRepository.updateUserSuspensionStatus).not.toHaveBeenCalled();
    });
  });

  describe('reactivateUser', () => {
    it('should reactivate a user successfully and clear the reason', async () => {
      const userId = 'user-123';

      userService.findById.mockResolvedValue(mockUser as any);
      adminRepository.updateUserSuspensionStatus.mockResolvedValue(undefined);

      await service.reactivateUser(userId);

      expect(userService.findById).toHaveBeenCalledWith(userId);
      expect(adminRepository.updateUserSuspensionStatus).toHaveBeenCalledWith(userId, false, null);
    });

    it('should throw NotFoundException if user to reactivate is not found', async () => {
      const userId = 'non-existent-user';

      userService.findById.mockResolvedValue(null);

      await expect(service.reactivateUser(userId)).rejects.toThrow(NotFoundException);
      expect(userService.findById).toHaveBeenCalledWith(userId);
      expect(adminRepository.updateUserSuspensionStatus).not.toHaveBeenCalled();
    });
  });
});
