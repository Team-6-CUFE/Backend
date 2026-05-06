import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FansService } from './fans.service';
import { FanRepository } from '../fan.repository';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { Track } from '../entities/track.entity';
import { Settings } from '../../settings/entities/settings.entity';

const MOCK_TRACK_ID = '123e4567-e89b-12d3-a456-426614174000';
const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const MOCK_ARTIST_ID = '550e8400-e29b-41d4-a716-446655440002';

const mockFanRow = (overrides?: object) => ({
  userId: MOCK_USER_ID,
  username: 'test_user',
  displayName: 'Test User',
  avatarUrl: 'https://example.com/avatar.jpg',
  playCount: 42,
  firstPlayedAt: new Date('2024-06-01T10:00:00Z'),
  ...overrides,
});

const mockTrack = (overrides?: object) => ({
  trackId: MOCK_TRACK_ID,
  userId: MOCK_ARTIST_ID,
  title: 'Midnight Drive',
  createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago (window closed)
  ...overrides,
});

const mockArtistSettings = (overrides?: object) => ({
  userId: MOCK_ARTIST_ID,
  showMyTrackTopAndFirstFans: true,
  ...overrides,
});

const mockFanRepository = () => ({
  computeTopFans: jest.fn(),
  computeFirstFans: jest.fn(),
  hasSnapshot: jest.fn(),
  findStoredFirstFans: jest.fn(),
  saveSnapshot: jest.fn(),
  findActiveTrackIds: jest.fn(),
  findTracksNeedingSnapshot: jest.fn(),
});

const mockRedisClient = () => ({
  get: jest.fn(),
  set: jest.fn(),
});

const mockTrackRepository = () => ({
  findOne: jest.fn(),
});

const mockSettingsRepository = () => ({
  findOne: jest.fn(),
});

describe('FansService', () => {
  let service: FansService;
  let fanRepo: ReturnType<typeof mockFanRepository>;
  let redis: ReturnType<typeof mockRedisClient>;
  let trackRepo: ReturnType<typeof mockTrackRepository>;
  let settingsRepo: ReturnType<typeof mockSettingsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FansService,
        { provide: FanRepository, useFactory: mockFanRepository },
        { provide: REDIS_CLIENT, useFactory: mockRedisClient },
        { provide: getRepositoryToken(Track), useFactory: mockTrackRepository },
        { provide: getRepositoryToken(Settings), useFactory: mockSettingsRepository },
      ],
    }).compile();

    service = module.get(FansService);
    fanRepo = module.get(FanRepository);
    redis = module.get(REDIS_CLIENT);
    trackRepo = module.get(getRepositoryToken(Track));
    settingsRepo = module.get(getRepositoryToken(Settings));
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getTopFans ───────────────────────────────────────────────────────────────

  describe('getTopFans', () => {
    it('should return cached result when Redis hit', async () => {
      const cached = [
        {
          rank: 1,
          playCount: 42,
          user: {
            userId: MOCK_USER_ID,
            username: 'test_user',
            displayName: 'Test User',
            avatarUrl: 'https://example.com/avatar.jpg',
          },
        },
      ];
      trackRepo.findOne.mockResolvedValue(mockTrack());
      settingsRepo.findOne.mockResolvedValue(mockArtistSettings());
      redis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.getTopFans(MOCK_TRACK_ID);

      expect(redis.get).toHaveBeenCalledWith(`top_fans:${MOCK_TRACK_ID}`);
      expect(fanRepo.computeTopFans).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });

    it('should compute and cache top fans on cache miss', async () => {
      const fans = [mockFanRow()];
      trackRepo.findOne.mockResolvedValue(mockTrack());
      settingsRepo.findOne.mockResolvedValue(mockArtistSettings());
      redis.get.mockResolvedValue(null);
      fanRepo.computeTopFans.mockResolvedValue(fans);
      redis.set.mockResolvedValue('OK');

      const result = await service.getTopFans(MOCK_TRACK_ID);

      expect(fanRepo.computeTopFans).toHaveBeenCalledWith(MOCK_TRACK_ID);
      expect(redis.set).toHaveBeenCalledWith(
        `top_fans:${MOCK_TRACK_ID}`,
        expect.any(String),
        expect.objectContaining({ EX: expect.any(Number) })
      );
      expect(result).toHaveLength(1);
      expect(result[0].rank).toBe(1);
      expect(result[0].playCount).toBe(42);
    });

    it('should return empty array when artist has showMyTrackTopAndFirstFans disabled', async () => {
      trackRepo.findOne.mockResolvedValue(mockTrack());
      settingsRepo.findOne.mockResolvedValue(
        mockArtistSettings({ showMyTrackTopAndFirstFans: false })
      );

      const result = await service.getTopFans(MOCK_TRACK_ID);

      expect(result).toEqual([]);
      expect(redis.get).not.toHaveBeenCalled();
    });

    it('should return empty array when artist settings not found', async () => {
      trackRepo.findOne.mockResolvedValue(mockTrack());
      settingsRepo.findOne.mockResolvedValue(null);

      const result = await service.getTopFans(MOCK_TRACK_ID);

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when track not found', async () => {
      trackRepo.findOne.mockResolvedValue(null);

      await expect(service.getTopFans(MOCK_TRACK_ID)).rejects.toThrow(NotFoundException);
    });

    it('should assign sequential ranks starting from 1', async () => {
      const fans = [
        mockFanRow({ playCount: 100 }),
        mockFanRow({ playCount: 50, userId: MOCK_ARTIST_ID }),
      ];
      trackRepo.findOne.mockResolvedValue(mockTrack());
      settingsRepo.findOne.mockResolvedValue(mockArtistSettings());
      redis.get.mockResolvedValue(null);
      fanRepo.computeTopFans.mockResolvedValue(fans);
      redis.set.mockResolvedValue('OK');

      const result = await service.getTopFans(MOCK_TRACK_ID);

      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
    });
  });

  // ─── getFirstFans ─────────────────────────────────────────────────────────────

  describe('getFirstFans', () => {
    it('should return cached result when Redis hit', async () => {
      const cached = [
        {
          rank: 1,
          playCount: 5,
          user: {
            userId: MOCK_USER_ID,
            username: 'test_user',
            displayName: 'Test User',
            avatarUrl: '',
          },
        },
      ];
      trackRepo.findOne.mockResolvedValue(mockTrack());
      settingsRepo.findOne.mockResolvedValue(mockArtistSettings());
      redis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.getFirstFans(MOCK_TRACK_ID);

      expect(redis.get).toHaveBeenCalledWith(`first_fans:${MOCK_TRACK_ID}`);
      expect(fanRepo.computeFirstFans).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });

    it('should return empty array when artist settings disables fan display', async () => {
      trackRepo.findOne.mockResolvedValue(mockTrack());
      settingsRepo.findOne.mockResolvedValue(
        mockArtistSettings({ showMyTrackTopAndFirstFans: false })
      );

      const result = await service.getFirstFans(MOCK_TRACK_ID);

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when track not found', async () => {
      trackRepo.findOne.mockResolvedValue(null);

      await expect(service.getFirstFans(MOCK_TRACK_ID)).rejects.toThrow(NotFoundException);
    });

    it('should compute live fans during 7-day window and cache 1h', async () => {
      // Track created 3 days ago → window still open
      const recentTrack = mockTrack({ createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) });
      const fans = [mockFanRow(), mockFanRow({ userId: MOCK_ARTIST_ID, playCount: 30 })];
      trackRepo.findOne.mockResolvedValue(recentTrack);
      settingsRepo.findOne.mockResolvedValue(mockArtistSettings());
      redis.get.mockResolvedValue(null);
      fanRepo.computeFirstFans.mockResolvedValue(fans);
      redis.set.mockResolvedValue('OK');

      const result = await service.getFirstFans(MOCK_TRACK_ID);

      expect(fanRepo.computeFirstFans).toHaveBeenCalledWith(MOCK_TRACK_ID);
      // 1h TTL during live window
      expect(redis.set).toHaveBeenCalledWith(`first_fans:${MOCK_TRACK_ID}`, expect.any(String), {
        EX: 3600,
      });
      expect(fanRepo.saveSnapshot).not.toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should load stored snapshot after window closes when snapshot exists', async () => {
      // Track created 10 days ago → window closed
      const oldTrack = mockTrack({ createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) });
      const storedFans = [mockFanRow()];
      trackRepo.findOne.mockResolvedValue(oldTrack);
      settingsRepo.findOne.mockResolvedValue(mockArtistSettings());
      redis.get.mockResolvedValue(null);
      fanRepo.hasSnapshot.mockResolvedValue(true);
      fanRepo.findStoredFirstFans.mockResolvedValue(storedFans);
      redis.set.mockResolvedValue('OK');

      const result = await service.getFirstFans(MOCK_TRACK_ID);

      expect(fanRepo.hasSnapshot).toHaveBeenCalledWith(MOCK_TRACK_ID);
      expect(fanRepo.findStoredFirstFans).toHaveBeenCalledWith(MOCK_TRACK_ID);
      expect(fanRepo.computeFirstFans).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should trigger snapshot when window closed and no snapshot exists', async () => {
      const oldTrack = mockTrack({ createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) });
      const fans = [mockFanRow()];
      trackRepo.findOne.mockResolvedValue(oldTrack);
      settingsRepo.findOne.mockResolvedValue(mockArtistSettings());
      redis.get.mockResolvedValue(null);
      fanRepo.hasSnapshot.mockResolvedValue(false);
      fanRepo.computeFirstFans.mockResolvedValue(fans);
      fanRepo.saveSnapshot.mockResolvedValue(undefined);
      redis.set.mockResolvedValue('OK');

      await service.getFirstFans(MOCK_TRACK_ID);

      expect(fanRepo.computeFirstFans).toHaveBeenCalledWith(MOCK_TRACK_ID);
      expect(fanRepo.saveSnapshot).toHaveBeenCalledWith(MOCK_TRACK_ID, fans);
    });
  });

  // ─── refreshTopFans ───────────────────────────────────────────────────────────

  describe('refreshTopFans', () => {
    it('should compute, cache, and return fan results', async () => {
      const fans = [mockFanRow({ playCount: 80 })];
      fanRepo.computeTopFans.mockResolvedValue(fans);
      redis.set.mockResolvedValue('OK');

      const result = await service.refreshTopFans(MOCK_TRACK_ID);

      expect(fanRepo.computeTopFans).toHaveBeenCalledWith(MOCK_TRACK_ID);
      expect(redis.set).toHaveBeenCalled();
      expect(result[0].rank).toBe(1);
      expect(result[0].playCount).toBe(80);
    });

    it('should return empty array when no qualifying fans', async () => {
      fanRepo.computeTopFans.mockResolvedValue([]);
      redis.set.mockResolvedValue('OK');

      const result = await service.refreshTopFans(MOCK_TRACK_ID);

      expect(result).toEqual([]);
    });
  });

  // ─── triggerFirstFansSnapshot ────────────────────────────────────────────────

  describe('triggerFirstFansSnapshot', () => {
    it('should compute fans, save snapshot, cache, and return top 5', async () => {
      const fans = Array.from({ length: 7 }, (_, i) =>
        mockFanRow({ userId: `user-${i}`, playCount: 10 - i })
      );
      fanRepo.computeFirstFans.mockResolvedValue(fans);
      fanRepo.saveSnapshot.mockResolvedValue(undefined);
      redis.set.mockResolvedValue('OK');

      const result = await service.triggerFirstFansSnapshot(MOCK_TRACK_ID);

      expect(fanRepo.saveSnapshot).toHaveBeenCalledWith(MOCK_TRACK_ID, fans);
      expect(result).toHaveLength(5); // only top 5 returned
      expect(result[0].rank).toBe(1);
    });
  });

  // ─── refreshAllTopFans ────────────────────────────────────────────────────────

  describe('refreshAllTopFans', () => {
    it('should call findActiveTrackIds and refreshTopFans for each track', async () => {
      fanRepo.findActiveTrackIds.mockResolvedValue([MOCK_TRACK_ID, 'track-2']);
      const refreshSpy = jest.spyOn(service, 'refreshTopFans').mockResolvedValue([]);

      await service.refreshAllTopFans();

      expect(fanRepo.findActiveTrackIds).toHaveBeenCalled();
      expect(refreshSpy).toHaveBeenCalledWith(MOCK_TRACK_ID);
      expect(refreshSpy).toHaveBeenCalledWith('track-2');
      expect(refreshSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle empty track list gracefully (no refreshTopFans called)', async () => {
      fanRepo.findActiveTrackIds.mockResolvedValue([]);
      const refreshSpy = jest.spyOn(service, 'refreshTopFans').mockResolvedValue([]);

      await service.refreshAllTopFans();

      expect(fanRepo.findActiveTrackIds).toHaveBeenCalled();
      expect(refreshSpy).not.toHaveBeenCalled();
    });

    it('should process tracks in batches of 50 (test with 51 ids)', async () => {
      const trackIds = Array.from({ length: 51 }, (_, i) => `track-${i}`);
      fanRepo.findActiveTrackIds.mockResolvedValue(trackIds);
      const refreshSpy = jest.spyOn(service, 'refreshTopFans').mockResolvedValue([]);

      await service.refreshAllTopFans();

      expect(refreshSpy).toHaveBeenCalledTimes(51);
    });
  });

  // ─── snapshotAllPendingFirstFans ──────────────────────────────────────────────

  describe('snapshotAllPendingFirstFans', () => {
    it('should call triggerFirstFansSnapshot for each pending track', async () => {
      fanRepo.findTracksNeedingSnapshot.mockResolvedValue([MOCK_TRACK_ID, 'track-2']);
      const snapshotSpy = jest.spyOn(service, 'triggerFirstFansSnapshot').mockResolvedValue([]);

      await service.snapshotAllPendingFirstFans();

      expect(fanRepo.findTracksNeedingSnapshot).toHaveBeenCalled();
      expect(snapshotSpy).toHaveBeenCalledWith(MOCK_TRACK_ID);
      expect(snapshotSpy).toHaveBeenCalledWith('track-2');
      expect(snapshotSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle empty list gracefully', async () => {
      fanRepo.findTracksNeedingSnapshot.mockResolvedValue([]);
      const snapshotSpy = jest.spyOn(service, 'triggerFirstFansSnapshot').mockResolvedValue([]);

      await service.snapshotAllPendingFirstFans();

      expect(snapshotSpy).not.toHaveBeenCalled();
    });

    it('should log error for rejected promises', async () => {
      fanRepo.findTracksNeedingSnapshot.mockResolvedValue([MOCK_TRACK_ID, 'track-fail']);
      jest
        .spyOn(service, 'triggerFirstFansSnapshot')
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('snapshot failed'));
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation();

      await service.snapshotAllPendingFirstFans();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('track-fail'),
        expect.any(Error)
      );
    });
  });
});
