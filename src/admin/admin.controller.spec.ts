import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SuspendUserDto } from './dto/suspend-user.dto';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: jest.Mocked<AdminService>;

  beforeEach(async () => {
    const mockAdminService = {
      getUsers: jest.fn(),
      suspendUser: jest.fn(),
      reactivateUser: jest.fn(),
      getTopTracks: jest.fn(),
      getPlatformStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockAdminService }],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    adminService = module.get(AdminService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return successfully paginated users with correct hasMore calculation', async () => {
      const limit = 20;
      const offset = 0;
      const search = 'test';
      const mockUsers = [{ id: '1', username: 'test1' }];
      const total = 50;

      adminService.getUsers.mockResolvedValue({ users: mockUsers as any, total });

      const result = await controller.getUsers(limit, offset, search);

      expect(adminService.getUsers).toHaveBeenCalledWith(limit, offset, search);
      expect(result).toEqual({
        status: 'success',
        data: {
          users: mockUsers,
          pagination: {
            limit: 20,
            offset: 0,
            total: 50,
            hasMore: true,
          },
        },
      });
    });

    it('should set hasMore to false when offset + limit >= total', async () => {
      const limit = 20;
      const offset = 40;
      const total = 50;

      adminService.getUsers.mockResolvedValue({ users: [] as any, total });

      const result = await controller.getUsers(limit, offset, undefined);

      expect(result.data.pagination.hasMore).toBe(false);
    });
  });

  describe('suspendUser', () => {
    it('should call suspendUser on the service and return a success message', async () => {
      const userId = 'user-123';
      const suspendDto: SuspendUserDto = { reason: 'Violation of terms' };

      adminService.suspendUser.mockResolvedValue(undefined);

      const result = await controller.suspendUser(userId, suspendDto);

      expect(adminService.suspendUser).toHaveBeenCalledWith(userId, suspendDto.reason);
      expect(result).toEqual({
        status: 'success',
        message: 'User suspended successfully',
      });
    });
  });

  describe('reactivateUser', () => {
    it('should call reactivateUser on the service and return a success message', async () => {
      const userId = 'user-123';

      adminService.reactivateUser.mockResolvedValue(undefined);

      const result = await controller.reactivateUser(userId);

      expect(adminService.reactivateUser).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        status: 'success',
        message: 'User reactivated successfully',
      });
    });
  });

  describe('getTopTracks', () => {
    it('should return a success response containing the top tracks', async () => {
      const mockTracks = [{ trackId: '1', title: 'Banger 1', playCount: 1000 }];

      adminService.getTopTracks.mockResolvedValue(mockTracks as any);

      const result = await controller.getTopTracks();

      expect(adminService.getTopTracks).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        status: 'success',
        data: {
          tracks: mockTracks,
        },
      });
    });
  });

  describe('getPlatformStats', () => {
    it('should return a success response containing platform statistics', async () => {
      const mockStats = {
        activeUsers: 150,
        totalPlays: 5000,
        totalUploads: 300,
        openReports: 5,
      };

      adminService.getPlatformStats.mockResolvedValue(mockStats);

      const result = await controller.getPlatformStats();

      expect(adminService.getPlatformStats).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        status: 'success',
        data: mockStats,
      });
    });
  });
});
