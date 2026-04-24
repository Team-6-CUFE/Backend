import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { WebsocketsService } from '../websockets/websockets.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationType } from './entities/notification.entity';
import { User } from '../user/entities/user.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repo: NotificationsRepository;
  let websocketsService: WebsocketsService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let settingsService: SettingsService;

  const mockNotificationsRepository = {
    createNotification: jest.fn(),
    getUnreadCount: jest.fn(),
    getNotifications: jest.fn(),
    deleteNotification: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    getUserDeviceTokens: jest.fn(),
  };

  const mockWebsocketsService = {
    emitToUser: jest.fn(),
  };

  const mockSettingsService = {
    getNotificationSettings: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: NotificationsRepository,
          useValue: mockNotificationsRepository,
        },
        {
          provide: WebsocketsService,
          useValue: mockWebsocketsService,
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    repo = module.get<NotificationsRepository>(NotificationsRepository);
    websocketsService = module.get<WebsocketsService>(WebsocketsService);
    settingsService = module.get<SettingsService>(SettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notifyNewFollower', () => {
    it('should save notification and emit websocket event', async () => {
      const actor = { userId: 'actor-1', username: 'john' } as User;
      const recipientId = 'recipient-1';
      const mockNotif = { notificationId: 'uuid', type: NotificationType.NEW_FOLLOWER };

      mockNotificationsRepository.createNotification.mockResolvedValue(mockNotif);
      mockNotificationsRepository.getUnreadCount.mockResolvedValue(5);
      mockSettingsService.getNotificationSettings.mockResolvedValue({
        data: { device: { newFollower: false } },
      });

      await service.notifyNewFollower(recipientId, actor);

      expect(repo.createNotification).toHaveBeenCalled();
      expect(websocketsService.emitToUser).toHaveBeenCalledWith(
        recipientId,
        'new_notification',
        expect.objectContaining({ unreadCount: 5 })
      );
    });
  });

  describe('markAsRead', () => {
    it('should throw NotFoundException if repo returns false', async () => {
      mockNotificationsRepository.markAsRead.mockResolvedValue(false);
      await expect(service.markAsRead('id', 'user')).rejects.toThrow(NotFoundException);
    });

    it('should resolve if repo returns true', async () => {
      mockNotificationsRepository.markAsRead.mockResolvedValue(true);
      await expect(service.markAsRead('id', 'user')).resolves.not.toThrow();
    });
  });

  describe('getUnreadCount', () => {
    it('should return count from repo', async () => {
      mockNotificationsRepository.getUnreadCount.mockResolvedValue(10);
      const result = await service.getUnreadCount('user-1');
      expect(result).toBe(10);
    });
  });
});
