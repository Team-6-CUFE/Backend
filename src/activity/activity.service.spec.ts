import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ActivityService } from './activity.service';
import { Activity, ActivityType } from './entities/activity.entity';

// ─── Chainable query builder mock ────────────────────────────────────────────

const makeQbMock = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
  getRawMany: jest.fn(),
});

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('ActivityService', () => {
  let service: ActivityService;
  let qbMock: ReturnType<typeof makeQbMock>;

  const mockActivityRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    qbMock = makeQbMock();
    mockActivityRepository.createQueryBuilder.mockReturnValue(qbMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        {
          provide: getRepositoryToken(Activity),
          useValue: mockActivityRepository,
        },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── createActivity ───────────────────────────────────────────────────────────

  describe('createActivity', () => {
    it('should call repository.create with correct fields and return the saved activity', async () => {
      const activityData = {
        activityId: 'act-uuid',
        activityType: ActivityType.TRACK_LIKE,
        targetId: 'track-uuid',
        userId: 'user-uuid',
        targetUserId: 'target-user-uuid',
      };
      mockActivityRepository.create.mockReturnValue(activityData);
      mockActivityRepository.save.mockResolvedValue(activityData);

      const result = await service.createActivity(
        ActivityType.TRACK_LIKE,
        'track-uuid',
        'user-uuid',
        'target-user-uuid'
      );

      expect(mockActivityRepository.create).toHaveBeenCalledWith({
        activityType: ActivityType.TRACK_LIKE,
        targetId: 'track-uuid',
        userId: 'user-uuid',
        targetUserId: 'target-user-uuid',
      });
      expect(mockActivityRepository.save).toHaveBeenCalledWith(activityData);
      expect(result).toBe(activityData);
    });

    it('should accept null for targetUserId', async () => {
      const activityData = {
        activityType: ActivityType.TRACK_LIKE,
        targetId: 'track-uuid',
        userId: 'user-uuid',
        targetUserId: null,
      };
      mockActivityRepository.create.mockReturnValue(activityData);
      mockActivityRepository.save.mockResolvedValue(activityData);

      await service.createActivity(ActivityType.TRACK_LIKE, 'track-uuid', 'user-uuid', null);

      expect(mockActivityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ targetUserId: null })
      );
    });
  });

  // ─── getActivitiesByUserIds ────────────────────────────────────────────────────

  describe('getActivitiesByUserIds', () => {
    const userIds = ['user-1', 'user-2'];

    it('should query with 4 activity types when includeReposts is true', async () => {
      qbMock.getMany.mockResolvedValue([]);

      await service.getActivitiesByUserIds(userIds, 1, 10, true);

      const andWhereCall = qbMock.andWhere.mock.calls.find((call) =>
        call[0].includes('activityType')
      );
      expect(andWhereCall).toBeDefined();
      const types = andWhereCall![1].types as ActivityType[];
      expect(types).toHaveLength(4);
      expect(types).toContain(ActivityType.TRACK_POSTED);
      expect(types).toContain(ActivityType.TRACK_REPOST);
      expect(types).toContain(ActivityType.PLAYLIST_POSTED);
      expect(types).toContain(ActivityType.PLAYLIST_REPOST);
    });

    it('should query with 2 activity types (POSTED only) when includeReposts is false', async () => {
      qbMock.getMany.mockResolvedValue([]);

      await service.getActivitiesByUserIds(userIds, 1, 10, false);

      const andWhereCall = qbMock.andWhere.mock.calls.find((call) =>
        call[0].includes('activityType')
      );
      expect(andWhereCall).toBeDefined();
      const types = andWhereCall![1].types as ActivityType[];
      expect(types).toHaveLength(2);
      expect(types).toContain(ActivityType.TRACK_POSTED);
      expect(types).toContain(ActivityType.PLAYLIST_POSTED);
      expect(types).not.toContain(ActivityType.TRACK_REPOST);
      expect(types).not.toContain(ActivityType.PLAYLIST_REPOST);
    });

    it('should compute correct offset: page=2, limit=10 → skip 10', async () => {
      qbMock.getMany.mockResolvedValue([]);

      await service.getActivitiesByUserIds(userIds, 2, 10, false);

      expect(qbMock.skip).toHaveBeenCalledWith(10);
      expect(qbMock.take).toHaveBeenCalledWith(10);
    });

    it('should compute correct offset: page=3, limit=5 → skip 10', async () => {
      qbMock.getMany.mockResolvedValue([]);

      await service.getActivitiesByUserIds(userIds, 3, 5, false);

      expect(qbMock.skip).toHaveBeenCalledWith(10);
      expect(qbMock.take).toHaveBeenCalledWith(5);
    });

    it('should return activities from getMany', async () => {
      const mockActivities = [{ activityId: 'act-1' }, { activityId: 'act-2' }] as Activity[];
      qbMock.getMany.mockResolvedValue(mockActivities);

      const result = await service.getActivitiesByUserIds(userIds, 1, 10, false);

      expect(result).toBe(mockActivities);
    });
  });

  // ─── deleteActivity ───────────────────────────────────────────────────────────

  describe('deleteActivity', () => {
    it('should call repository.delete with activityType, targetId and userId', async () => {
      mockActivityRepository.delete.mockResolvedValue({ affected: 1 });

      await service.deleteActivity(ActivityType.TRACK_LIKE, 'track-uuid', 'user-uuid');

      expect(mockActivityRepository.delete).toHaveBeenCalledWith({
        activityType: ActivityType.TRACK_LIKE,
        targetId: 'track-uuid',
        userId: 'user-uuid',
      });
    });
  });

  // ─── getLikedByUsers ─────────────────────────────────────────────────────────

  describe('getLikedByUsers', () => {
    it('should call getRawMany and return results', async () => {
      const mockUsers = [{ userId: 'user-1', username: 'alice' }];
      qbMock.getRawMany.mockResolvedValue(mockUsers);

      const result = await service.getLikedByUsers('current-user-uuid');

      expect(qbMock.getRawMany).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockUsers);
    });

    it('should use default limit of 8 when limit is not provided', async () => {
      qbMock.getRawMany.mockResolvedValue([]);

      await service.getLikedByUsers('current-user-uuid');

      expect(qbMock.limit).toHaveBeenCalledWith(8);
    });

    it('should use provided limit when specified', async () => {
      qbMock.getRawMany.mockResolvedValue([]);

      await service.getLikedByUsers('current-user-uuid', 5);

      expect(qbMock.limit).toHaveBeenCalledWith(5);
    });

    it('should filter by TRACK_LIKE and PLAYLIST_LIKE activity types', async () => {
      qbMock.getRawMany.mockResolvedValue([]);

      await service.getLikedByUsers('current-user-uuid');

      const whereCall = qbMock.where.mock.calls.find((call) => call[0].includes('activityType'));
      expect(whereCall).toBeDefined();
      const types = whereCall![1].types as ActivityType[];
      expect(types).toContain(ActivityType.TRACK_LIKE);
      expect(types).toContain(ActivityType.PLAYLIST_LIKE);
    });

    it('should filter by currentUserId', async () => {
      qbMock.getRawMany.mockResolvedValue([]);

      await service.getLikedByUsers('current-user-uuid');

      const andWhereCall = qbMock.andWhere.mock.calls.find(
        (call) => call[1]?.currentUserId !== undefined
      );
      expect(andWhereCall).toBeDefined();
      expect(andWhereCall![1].currentUserId).toBe('current-user-uuid');
    });
  });
});
