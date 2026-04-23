import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { WebsocketsService } from '../websockets/websockets.service';
import { NotificationType } from './entities/notification.entity';
import { User } from '../user/entities/user.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repo: NotificationsRepository;
  let websocketsService: WebsocketsService;

  // 1. Create fake versions of the dependencies
  const mockNotificationsRepository = {
    createNotification: jest.fn(),
    getUnreadCount: jest.fn(),
    getNotifications: jest.fn(),
    deleteNotification: jest.fn(),
  };

  const mockWebsocketsService = {
    emitToUser: jest.fn(),
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
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    repo = module.get<NotificationsRepository>(NotificationsRepository);
    websocketsService = module.get<WebsocketsService>(WebsocketsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notifyNewFollower', () => {
    it('should save notification and emit websocket event with unread count', async () => {
      // Arrange
      const actor = { userId: 'actor-1', username: 'john', avatarUrl: 'url' } as User;
      const recipientId = 'recipient-1';
      const mockNotif = {
        notificationId: 'uuid',
        type: NotificationType.NEW_FOLLOWER,
        createdAt: new Date(),
      };

      mockNotificationsRepository.createNotification.mockResolvedValue(mockNotif);
      mockNotificationsRepository.getUnreadCount.mockResolvedValue(5);

      // Act
      await service.notifyNewFollower(recipientId, actor);

      // Assert
      expect(repo.createNotification).toHaveBeenCalledWith(
        NotificationType.NEW_FOLLOWER,
        recipientId,
        actor.userId
      );
      expect(websocketsService.emitToUser).toHaveBeenCalledWith(
        recipientId,
        'new_notification',
        expect.objectContaining({ unreadCount: 5 }) // Verifies unread count is attached
      );
    });
  });

  describe('getNotifications', () => {
    it('should format raw database records into standard activity objects (no target)', async () => {
      // Arrange
      const fakeDate = new Date();
      const mockRawNotifs = [
        {
          notificationId: 'notif-1',
          isRead: false,
          createdAt: fakeDate,
          type: 'NEW_FOLLOWER',
          actor: { userId: 'actor-1', username: 'john_doe', avatarUrl: 'pic.jpg' },
          // No track or playlist here
        },
      ];
      mockNotificationsRepository.getNotifications.mockResolvedValue([mockRawNotifs, 1]);

      // Act
      const result = await service.getNotifications('user-1', 20, 0);

      // Assert
      expect(result.total).toEqual(1);
      expect(result.notifications[0]).toEqual({
        notificationId: 'notif-1',
        isRead: false,
        createdAt: fakeDate,
        activity: {
          activityId: 'act_notif-1',
          activityType: 'NEW_FOLLOWER',
          actor: {
            userId: 'actor-1',
            username: 'john_doe',
            displayName: 'john_doe',
            avatarUrl: 'pic.jpg',
          },
          target: null, // Verifies target logic defaults to null
          createdAt: fakeDate,
        },
      });
    });
  });

  describe('deleteNotification', () => {
    it('should call the repository delete function with exact arguments', async () => {
      // Act
      await service.deleteNotification('recipient-1', 'actor-1', NotificationType.NEW_FOLLOWER);

      // Assert
      expect(repo.deleteNotification).toHaveBeenCalledWith(
        'recipient-1',
        'actor-1',
        NotificationType.NEW_FOLLOWER
      );
    });
  });
});
