import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SettingsService } from '../settings/settings.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  // 1. Create a fake version of the service
  const mockNotificationsService = {
    getNotifications: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  };

  const mockSettingsService = {
    getUserSettings: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService, // Inject the fake service
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService, // Inject the fake settings service
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clean up between tests
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getNotifications', () => {
    it('should return successfully formatted paginated data', async () => {
      // Arrange: Setup our fake service to return a specific output
      const userId = 'user-123';
      const mockResult = {
        notifications: [{ notificationId: 'notif_001', isRead: false }],
        total: 1,
      };

      mockNotificationsService.getNotifications.mockResolvedValue(mockResult);

      // Act: Call the controller method
      // (limit=20, offset=0, type='follow')
      const response = await controller.getNotifications(userId, 20, 0, 'follow');

      // Assert: Verify the service was called with the exact right variables
      expect(service.getNotifications).toHaveBeenCalledWith(userId, 20, 0, 'follow');

      // Assert: Verify the final JSON matches your API spec perfectly
      expect(response).toEqual({
        status: 'success',
        data: {
          notifications: mockResult.notifications,
          pagination: {
            limit: 20,
            offset: 0,
            total: 1,
            hasMore: false, // Because 0 + 20 is not < 1
          },
        },
      });
    });

    it('should cap the limit at 50 to prevent huge queries', async () => {
      mockNotificationsService.getNotifications.mockResolvedValue({ notifications: [], total: 0 });

      // Act: Pass a limit of 100
      await controller.getNotifications('user-123', 100, 0);

      // Assert: The service should only be called with 50
      expect(service.getNotifications).toHaveBeenCalledWith('user-123', 50, 0, undefined);
    });
  });

  describe('markAsRead', () => {
    it('should call the service and return a success payload', async () => {
      // Arrange: service just resolves successfully without returning data
      mockNotificationsService.markAsRead.mockResolvedValue(undefined);

      const notificationId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123';

      // Act
      const response = await controller.markAsRead(notificationId, userId);

      // Assert
      expect(service.markAsRead).toHaveBeenCalledWith(notificationId, userId);
      expect(response).toEqual({
        status: 'success',
        message: 'Notification marked as read',
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should call the service and return a success payload', async () => {
      // Arrange
      mockNotificationsService.markAllAsRead.mockResolvedValue(undefined);
      const userId = 'user-123';

      // Act
      const response = await controller.markAllAsRead(userId);

      // Assert
      expect(service.markAllAsRead).toHaveBeenCalledWith(userId);
      expect(response).toEqual({
        status: 'success',
        message: 'All notifications marked as read',
      });
    });
  });
});
