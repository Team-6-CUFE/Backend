import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { UserService } from '../user/user.service';
import { TrackService } from '../track/track.service';
import { TrackRepository } from '../track/track.repository';
import { UserRepository } from '../user/user.repository';
import { Report } from './entities/report.entity';
import { ReportStatus, ReportType, ReportReason } from './report-enums';
import { CreateReportDto } from './dto/createReport.dto';

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

  const mockUserService = {
    findById: jest.fn(),
  };

  const mockTrackService = {
    getTrackById: jest.fn(),
  };

  const mockTrackRepository = {
    findCommentById: jest.fn(),
    findAllTracksWithReportCount: jest.fn(),
  };

  const mockUserRepository = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const mockAdminRepository = {
      findAllUsers: jest.fn(),
      updateUserSuspensionStatus: jest.fn(),
      getTopTracks: jest.fn(),
      getPlatformStats: jest.fn(),
      getEngagementAnalytics30Days: jest.fn(),
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

  afterEach(() => jest.clearAllMocks());

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

  describe('getEngagementAnalytics', () => {
    it('should return 30-day engagement analytics from the repository', async () => {
      const mockTimeline = [
        {
          date: '2026-04-20',
          activeUsers: 85,
          uploads: 5,
          plays: 120,
          likes: 45,
          reposts: 10,
        },
      ];

      adminRepository.getEngagementAnalytics30Days.mockResolvedValue(mockTimeline as any);

      const result = await service.getEngagementAnalytics();

      expect(adminRepository.getEngagementAnalytics30Days).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTimeline);
    });
  }); // 👈 Here are the fully restored closing brackets!

  describe('addReport', () => {
    it('should submit a report successfully', async () => {
      const userId = 'user-123';
      const dto: CreateReportDto = {
        type: ReportType.TRACK,
        targetId: 'track-123',
        reason: ReportReason.COPYRIGHT,
        description: 'Stolen',
      };
      mockReportRepository.findOne.mockResolvedValue(null);
      mockTrackService.getTrackById.mockResolvedValue({ userId: 'other-user' });
      mockReportRepository.create.mockReturnValue({ ...dto, reporterId: userId });
      mockReportRepository.save.mockResolvedValue(undefined);

      const result = await service.addReport(userId, dto);

      expect(result.status).toBe('success');
      expect(result.message).toBe('Report submitted successfully');
    });

    it('should throw BadRequestException if report already exists', async () => {
      mockReportRepository.findOne.mockResolvedValue({ reportId: 'existing' });

      await expect(
        service.addReport('user-123', {
          type: ReportType.TRACK,
          targetId: 'track-123',
          reason: ReportReason.COPYRIGHT,
        } as CreateReportDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user reports themselves', async () => {
      mockReportRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addReport('user-123', {
          type: ReportType.USER,
          targetId: 'user-123',
          reason: ReportReason.SPAM,
        } as CreateReportDto)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user reports their own track', async () => {
      mockReportRepository.findOne.mockResolvedValue(null);
      mockTrackService.getTrackById.mockResolvedValue({ userId: 'user-123' });

      await expect(
        service.addReport('user-123', {
          type: ReportType.TRACK,
          targetId: 'track-123',
          reason: ReportReason.COPYRIGHT,
        } as CreateReportDto)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user reports their own comment', async () => {
      mockReportRepository.findOne.mockResolvedValue(null);
      mockTrackRepository.findCommentById.mockResolvedValue({
        commentId: 'c-1',
        userId: 'user-123',
        content: 'hi',
      });

      await expect(
        service.addReport('user-123', {
          type: ReportType.COMMENT,
          targetId: 'comment-123',
          reason: ReportReason.SPAM,
        } as CreateReportDto)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAllReports', () => {
    it('should return paginated enriched reports', async () => {
      const mockReport = {
        reportId: 'r-1',
        reporterId: 'user-123',
        targetId: 'track-123',
        type: ReportType.TRACK,
        reason: ReportReason.COPYRIGHT,
        status: ReportStatus.PENDING,
      };
      mockReportRepository.findAndCount.mockResolvedValue([[mockReport], 1]);
      mockUserRepository.findById.mockResolvedValue({
        userId: 'user-123',
        username: 'dj_nour',
        displayName: 'DJ Nour',
        avatarUrl: null,
        coverPhoto: null,
      });
      mockTrackService.getTrackById.mockResolvedValue({
        trackId: 'track-123',
        title: 'Midnight Drive',
        coverImage: null,
      });

      const result = await service.getAllReports(1, 20);

      expect(result.status).toBe('success');
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('deleteReport', () => {
    it('should delete a report successfully', async () => {
      mockReportRepository.findOne.mockResolvedValue({ reportId: 'r-1' });
      mockReportRepository.delete.mockResolvedValue(undefined);

      const result = await service.deleteReport('r-1');

      expect(result.status).toBe('success');
      expect(mockReportRepository.delete).toHaveBeenCalledWith('r-1');
    });

    it('should throw BadRequestException if report not found', async () => {
      mockReportRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteReport('non-existent')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateReportStatus', () => {
    it('should update report status successfully', async () => {
      mockReportRepository.findOne.mockResolvedValue({ reportId: 'r-1' });
      mockReportRepository.update.mockResolvedValue(undefined);

      const result = await service.updateReportStatus(ReportStatus.RESOLVED, 'r-1');

      expect(result.status).toBe('success');
      expect(mockReportRepository.update).toHaveBeenCalledWith('r-1', {
        status: ReportStatus.RESOLVED,
        reviewedAt: expect.any(Date),
      });
    });

    it('should throw BadRequestException if report not found', async () => {
      mockReportRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateReportStatus(ReportStatus.RESOLVED, 'non-existent')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getReport', () => {
    it('should return a single enriched report', async () => {
      const mockReport = {
        reportId: 'r-1',
        reporterId: 'user-123',
        targetId: 'track-123',
        type: ReportType.TRACK,
      };
      mockReportRepository.findOne.mockResolvedValue(mockReport);
      mockUserRepository.findById.mockResolvedValue({
        userId: 'user-123',
        username: 'dj_nour',
        displayName: 'DJ Nour',
        avatarUrl: null,
        coverPhoto: null,
      });
      mockTrackService.getTrackById.mockResolvedValue({
        trackId: 'track-123',
        title: 'Midnight Drive',
        coverImage: null,
      });

      const result = await service.getReport('r-1');

      expect(result.status).toBe('success');
      expect(result.data).toHaveProperty('reporter');
      expect(result.data).toHaveProperty('target');
    });

    it('should throw BadRequestException if report not found', async () => {
      mockReportRepository.findOne.mockResolvedValue(null);

      await expect(service.getReport('non-existent')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAllTracksWithReportCount', () => {
    it('should return paginated tracks with report counts', async () => {
      const mockTracks = [{ trackId: 'track-123', title: 'Midnight Drive', reportsCount: 3 }];
      mockTrackRepository.findAllTracksWithReportCount.mockResolvedValue({
        tracks: mockTracks,
        total: 1,
      });

      const result = await service.getAllTracksWithReportCount(1, 20);

      expect(result.status).toBe('success');
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('reportsCount', 3);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    });
  });
});
