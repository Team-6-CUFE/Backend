import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { UserService } from '../user/user.service';
import { Report } from './entities/report.entity';

import { TrackService } from '../track/track.service';
import { TrackRepository } from '../track/track.repository';
import { UserRepository } from '../user/user.repository';

describe('AdminService', () => {
  let service: AdminService;
  let adminRepository: jest.Mocked<AdminRepository>;
  let userService: jest.Mocked<UserService>;

  const mockUser = { id: 'user-123', username: 'testuser' };
  const mockReportRepository = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  beforeEach(async () => {
    const mockAdminRepository = {
      findAllUsers: jest.fn(),
      updateUserSuspensionStatus: jest.fn(),
      getTopTracks: jest.fn(),
      getPlatformStats: jest.fn(),
    };

    const mockUserService = {
      findById: jest.fn(),
    };
    const mockTrackService = {
      getTrackById: jest.fn(),
    };

    const mockTrackRepository = {
      findCommentById: jest.fn(),
    };

    const mockUserRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: AdminRepository, useValue: mockAdminRepository },
        { provide: UserService, useValue: mockUserService },
        { provide: getRepositoryToken(Report), useValue: mockReportRepository },
        { provide: TrackService, useValue: mockTrackService },
        { provide: TrackRepository, useValue: mockTrackRepository },
        { provide: UserRepository, useValue: mockUserRepository },
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

  describe('getTopTracks', () => {
    it('should return the top 5 tracks from the repository', async () => {
      const mockTracks = [
        { trackId: '1', title: 'Banger 1', playCount: 1000 },
        { trackId: '2', title: 'Banger 2', playCount: 800 },
      ];

      adminRepository.getTopTracks.mockResolvedValue(mockTracks as any);

      const result = await service.getTopTracks();

      expect(adminRepository.getTopTracks).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTracks);
    });
  });

  describe('getPlatformStats', () => {
    it('should return overall platform statistics', async () => {
      const mockStats = {
        activeUsers: 150,
        totalPlays: 5000,
        totalUploads: 300,
        openReports: 5,
      };

      adminRepository.getPlatformStats.mockResolvedValue(mockStats);

      const result = await service.getPlatformStats();

      expect(adminRepository.getPlatformStats).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockStats);
    });
  });
});
