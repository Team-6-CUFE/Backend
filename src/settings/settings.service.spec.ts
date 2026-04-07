import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsRepository } from './settings.repository';

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440001';

const mockSettings = (overrides?: object) => ({
  userId: MOCK_USER_ID,
  showMyActivities: true,
  allowMessagesFromAnyone: true,
  showWhenTopOrFirstFan: true,
  showMyTrackTopAndFirstFans: true,
  emailNewFollower: false,
  emailRepost: true,
  emailNewPost: true,
  emailLikesPlays: false,
  emailComment: false,
  emailRecommended: true,
  emailNewMessage: true,
  deviceNewFollower: true,
  deviceRepost: true,
  deviceNewPost: true,
  deviceLikesPlays: true,
  deviceComment: true,
  deviceRecommended: true,
  deviceNewMessage: 'everyone',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

const mockSettingsRepository = () => ({
  getPrivacySettings: jest.fn(),
  updatePrivacySettings: jest.fn(),
  createDefaultSettings: jest.fn(),
  delete: jest.fn(),
});

describe('SettingsService', () => {
  let service: SettingsService;
  let repo: ReturnType<typeof mockSettingsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: SettingsRepository, useFactory: mockSettingsRepository },
      ],
    }).compile();

    service = module.get(SettingsService);
    repo = module.get(SettingsRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getPrivacySettings ──────────────────────────────────────────────────────

  describe('getPrivacySettings', () => {
    it('should return shaped privacy settings on success', async () => {
      repo.getPrivacySettings.mockResolvedValue(mockSettings());

      const result = await service.getPrivacySettings(MOCK_USER_ID);

      expect(repo.getPrivacySettings).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(result.status).toBe('success');
      expect(result.message).toBe('Privacy settings retrieved successfully');
      expect(result.data.showMyActivities).toBe(true);
      expect(result.data.allowMessagesFromAnyone).toBe(true);
      expect(result.data.showWhenTopOrFirstFan).toBe(true);
      expect(result.data.showMyTrackTopAndFirstFans).toBe(true);
    });

    it('should expose only PrivacySettingsDto fields (no userId, no email fields)', async () => {
      repo.getPrivacySettings.mockResolvedValue(mockSettings());

      const result = await service.getPrivacySettings(MOCK_USER_ID);

      expect((result.data as any).userId).toBeUndefined();
      expect((result.data as any).emailNewFollower).toBeUndefined();
    });

    it('should throw NotFoundException when settings not found', async () => {
      repo.getPrivacySettings.mockResolvedValue(null);

      await expect(service.getPrivacySettings(MOCK_USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with userId in message', async () => {
      repo.getPrivacySettings.mockResolvedValue(null);

      await expect(service.getPrivacySettings(MOCK_USER_ID)).rejects.toThrow(
        `Privacy settings for user ${MOCK_USER_ID} not found`
      );
    });
  });

  // ─── updatePrivacySettings ───────────────────────────────────────────────────

  describe('updatePrivacySettings', () => {
    it('should update and return shaped settings', async () => {
      const updated = mockSettings({ showMyActivities: false });
      repo.updatePrivacySettings.mockResolvedValue(updated);

      const result = await service.updatePrivacySettings(MOCK_USER_ID, { showMyActivities: false });

      expect(repo.updatePrivacySettings).toHaveBeenCalledWith(MOCK_USER_ID, {
        showMyActivities: false,
      });
      expect(result.status).toBe('success');
      expect(result.message).toBe('Privacy settings updated successfully');
      expect(result.data.showMyActivities).toBe(false);
    });

    it('should throw NotFoundException when settings not found', async () => {
      repo.updatePrivacySettings.mockResolvedValue(null);

      await expect(service.updatePrivacySettings(MOCK_USER_ID, {})).rejects.toThrow(
        NotFoundException
      );
    });

    it('should update multiple fields at once', async () => {
      const dto = { showMyActivities: false, allowMessagesFromAnyone: false };
      const updated = mockSettings({ showMyActivities: false, allowMessagesFromAnyone: false });
      repo.updatePrivacySettings.mockResolvedValue(updated);

      const result = await service.updatePrivacySettings(MOCK_USER_ID, dto);

      expect(result.data.showMyActivities).toBe(false);
      expect(result.data.allowMessagesFromAnyone).toBe(false);
    });

    it('should expose only PrivacySettingsDto fields in response', async () => {
      repo.updatePrivacySettings.mockResolvedValue(mockSettings());

      const result = await service.updatePrivacySettings(MOCK_USER_ID, {});

      expect((result.data as any).userId).toBeUndefined();
      expect((result.data as any).emailNewFollower).toBeUndefined();
    });
  });

  // ─── createDefaultSettings ───────────────────────────────────────────────────

  describe('createDefaultSettings', () => {
    it('should call repo and return created settings', async () => {
      const settings = mockSettings();
      repo.createDefaultSettings.mockResolvedValue(settings);

      const result = await service.createDefaultSettings(MOCK_USER_ID);

      expect(repo.createDefaultSettings).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(result).toBe(settings);
    });
  });

  // ─── canShowUserAsFan ────────────────────────────────────────────────────────

  describe('canShowUserAsFan', () => {
    it('should return true when showWhenTopOrFirstFan is true', async () => {
      repo.getPrivacySettings.mockResolvedValue(mockSettings({ showWhenTopOrFirstFan: true }));

      expect(await service.canShowUserAsFan(MOCK_USER_ID)).toBe(true);
    });

    it('should return false when showWhenTopOrFirstFan is false', async () => {
      repo.getPrivacySettings.mockResolvedValue(mockSettings({ showWhenTopOrFirstFan: false }));

      expect(await service.canShowUserAsFan(MOCK_USER_ID)).toBe(false);
    });
  });

  // ─── canShowTrackFans ────────────────────────────────────────────────────────

  describe('canShowTrackFans', () => {
    it('should return true when showMyTrackTopAndFirstFans is true', async () => {
      repo.getPrivacySettings.mockResolvedValue(mockSettings({ showMyTrackTopAndFirstFans: true }));

      expect(await service.canShowTrackFans(MOCK_USER_ID)).toBe(true);
    });

    it('should return false when showMyTrackTopAndFirstFans is false', async () => {
      repo.getPrivacySettings.mockResolvedValue(
        mockSettings({ showMyTrackTopAndFirstFans: false })
      );

      expect(await service.canShowTrackFans(MOCK_USER_ID)).toBe(false);
    });
  });

  // ─── canDisplayFanRelationship ───────────────────────────────────────────────

  const MOCK_ARTIST_ID = '550e8400-e29b-41d4-a716-446655440002';

  describe('canDisplayFanRelationship', () => {
    it('should return true when both user and artist allow fan display', async () => {
      repo.getPrivacySettings
        .mockResolvedValueOnce(mockSettings({ showWhenTopOrFirstFan: true }))
        .mockResolvedValueOnce(
          mockSettings({ userId: MOCK_ARTIST_ID, showMyTrackTopAndFirstFans: true })
        );

      expect(await service.canDisplayFanRelationship(MOCK_USER_ID, MOCK_ARTIST_ID)).toBe(true);
    });

    it('should return false when user has disabled showWhenTopOrFirstFan', async () => {
      repo.getPrivacySettings
        .mockResolvedValueOnce(mockSettings({ showWhenTopOrFirstFan: false }))
        .mockResolvedValueOnce(
          mockSettings({ userId: MOCK_ARTIST_ID, showMyTrackTopAndFirstFans: true })
        );

      expect(await service.canDisplayFanRelationship(MOCK_USER_ID, MOCK_ARTIST_ID)).toBe(false);
    });

    it('should return false when artist has disabled showMyTrackTopAndFirstFans', async () => {
      repo.getPrivacySettings
        .mockResolvedValueOnce(mockSettings({ showWhenTopOrFirstFan: true }))
        .mockResolvedValueOnce(
          mockSettings({ userId: MOCK_ARTIST_ID, showMyTrackTopAndFirstFans: false })
        );

      expect(await service.canDisplayFanRelationship(MOCK_USER_ID, MOCK_ARTIST_ID)).toBe(false);
    });
  });

  // ─── resetToDefaults ─────────────────────────────────────────────────────────

  describe('resetToDefaults', () => {
    it('should delete existing settings and create new defaults', async () => {
      const fresh = mockSettings();
      repo.delete.mockResolvedValue(undefined);
      repo.createDefaultSettings.mockResolvedValue(fresh);

      const result = await service.resetToDefaults(MOCK_USER_ID);

      expect(repo.delete).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(repo.createDefaultSettings).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(result).toBe(fresh);
    });
  });
});
