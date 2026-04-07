import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440001';

const mockSettingsService = () => ({
  getPrivacySettings: jest.fn(),
  updatePrivacySettings: jest.fn(),
});

const mockPrivacyData = (overrides?: object) => ({
  showMyActivities: true,
  allowMessagesFromAnyone: true,
  showWhenTopOrFirstFan: true,
  showMyTrackTopAndFirstFans: true,
  ...overrides,
});

describe('SettingsController', () => {
  let controller: SettingsController;
  let service: ReturnType<typeof mockSettingsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [{ provide: SettingsService, useFactory: mockSettingsService }],
    }).compile();

    controller = module.get(SettingsController);
    service = module.get(SettingsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getSettings ─────────────────────────────────────────────────────────────

  describe('getSettings', () => {
    it('should delegate to service with userId', async () => {
      const expected = {
        status: 'success',
        message: 'Privacy settings retrieved successfully',
        data: mockPrivacyData(),
      };
      service.getPrivacySettings.mockResolvedValue(expected);

      await controller.getSettings(MOCK_USER_ID);

      expect(service.getPrivacySettings).toHaveBeenCalledWith(MOCK_USER_ID);
    });

    it('should return service response as-is', async () => {
      const expected = {
        status: 'success',
        message: 'Privacy settings retrieved successfully',
        data: mockPrivacyData(),
      };
      service.getPrivacySettings.mockResolvedValue(expected);

      const result = await controller.getSettings(MOCK_USER_ID);

      expect(result).toBe(expected);
    });

    it('should propagate NotFoundException from service', async () => {
      service.getPrivacySettings.mockRejectedValue(new NotFoundException());

      await expect(controller.getSettings(MOCK_USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateSettings ──────────────────────────────────────────────────────────

  describe('updateSettings', () => {
    it('should delegate to service with userId and dto', async () => {
      const dto = { showMyActivities: false };
      service.updatePrivacySettings.mockResolvedValue({
        status: 'success',
        message: 'Privacy settings updated successfully',
        data: mockPrivacyData({ showMyActivities: false }),
      });

      await controller.updateSettings(MOCK_USER_ID, dto as any);

      expect(service.updatePrivacySettings).toHaveBeenCalledWith(MOCK_USER_ID, dto);
    });

    it('should return service response as-is', async () => {
      const dto = { showWhenTopOrFirstFan: false };
      const expected = {
        status: 'success',
        message: 'Privacy settings updated successfully',
        data: mockPrivacyData({ showWhenTopOrFirstFan: false }),
      };
      service.updatePrivacySettings.mockResolvedValue(expected);

      const result = await controller.updateSettings(MOCK_USER_ID, dto as any);

      expect(result).toBe(expected);
    });

    it('should propagate NotFoundException from service', async () => {
      service.updatePrivacySettings.mockRejectedValue(new NotFoundException());

      await expect(controller.updateSettings(MOCK_USER_ID, {} as any)).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
