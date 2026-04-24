import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SettingsService } from '../settings/settings.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockNotificationsService = {
    getNotifications: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    getUnreadCount: jest.fn(),
    sendPushNotification: jest.fn(),
  };

  const mockSettingsService = {
    getNotificationSettings: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getNotifications', () => {
    it('should return successfully formatted paginated data', async () => {
      const userId = 'user-123';
      const mockResult = {
        notifications: [{ notificationId: 'notif_001', isRead: false }],
        total: 1,
      };

      mockNotificationsService.getNotifications.mockResolvedValue(mockResult);

      const response = await controller.getNotifications(userId, 20, 0, 'follow');

      expect(service.getNotifications).toHaveBeenCalledWith(userId, 20, 0, 'follow');
      expect(response).toEqual({
        status: 'success',
        data: {
          notifications: mockResult.notifications,
          pagination: {
            limit: 20,
            offset: 0,
            total: 1,
            hasMore: false,
          },
        },
      });
    });

    it('should cap the limit at 50', async () => {
      mockNotificationsService.getNotifications.mockResolvedValue({ notifications: [], total: 0 });
      await controller.getNotifications('user-123', 100, 0);
      expect(service.getNotifications).toHaveBeenCalledWith('user-123', 50, 0, undefined);
    });
  });

  describe('markAsRead', () => {
    it('should return success payload', async () => {
      mockNotificationsService.markAsRead.mockResolvedValue(undefined);
      const response = await controller.markAsRead('notif-1', 'user-1');
      expect(response).toEqual({ status: 'success', message: 'Notification marked as read' });
    });
  });

  describe('getUnreadCount', () => {
    it('should return the unread count payload', async () => {
      mockNotificationsService.getUnreadCount.mockResolvedValue(12);
      const response = await controller.getUnreadCount('user-1');
      expect(response.data.unreadCount).toEqual(12);
    });
  });
});
