import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { WebsocketsService } from '../websockets/websockets.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationType } from './entities/notification.entity';
import { User } from '../user/entities/user.entity';

jest.mock('firebase-admin/messaging', () => ({
  getMessaging: jest.fn().mockReturnValue({
    sendEachForMulticast: jest
      .fn()
      .mockResolvedValue({ successCount: 1, failureCount: 0, responses: [] }),
  }),
}));

jest.mock('../common/utilities/captcha.util', () => ({
  getFirebaseApp: jest.fn().mockReturnValue({}),
}));

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
    getFollowers: jest.fn(),
    saveDeviceToken: jest.fn(),
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

  // ─── getNotifications ────────────────────────────────────────────────────────

  describe('getNotifications', () => {
    const baseNotif = {
      notificationId: 'notif-1',
      isRead: false,
      createdAt: new Date('2024-01-01'),
      type: NotificationType.NEW_LIKE,
      actor: { userId: 'actor-1', username: 'alice', avatarUrl: null },
      track: null,
      playlist: null,
    };

    it('should return formatted notifications with track target for NEW_LIKE type', async () => {
      const notifWithTrack = {
        ...baseNotif,
        track: { trackId: 'track-1', title: 'My Track', coverImage: 'http://img.com/cover.jpg' },
      };
      mockNotificationsRepository.getNotifications.mockResolvedValue([[notifWithTrack], 1]);

      const result = await service.getNotifications('user-1', 10, 0);

      expect(result.total).toBe(1);
      expect(result.notifications[0].activity.target).toEqual({
        type: 'track',
        trackId: 'track-1',
        title: 'My Track',
        coverImageUrl: 'http://img.com/cover.jpg',
      });
    });

    it('should return formatted notifications with playlist target for NEW_LIKE type when track is null', async () => {
      const notifWithPlaylist = {
        ...baseNotif,
        track: null,
        playlist: {
          playlistId: 'pl-1',
          title: 'My Playlist',
          coverImage: 'http://img.com/pl.jpg',
        },
      };
      mockNotificationsRepository.getNotifications.mockResolvedValue([[notifWithPlaylist], 1]);

      const result = await service.getNotifications('user-1', 10, 0);

      expect(result.notifications[0].activity.target).toEqual({
        type: 'playlist',
        playlistId: 'pl-1',
        title: 'My Playlist',
        coverImageUrl: 'http://img.com/pl.jpg',
      });
    });

    it('should return target: null for NEW_FOLLOWER type', async () => {
      const followerNotif = { ...baseNotif, type: NotificationType.NEW_FOLLOWER };
      mockNotificationsRepository.getNotifications.mockResolvedValue([[followerNotif], 1]);

      const result = await service.getNotifications('user-1', 10, 0);

      expect(result.notifications[0].activity.target).toBeNull();
    });

    it('should return correct total and notifications array shape', async () => {
      mockNotificationsRepository.getNotifications.mockResolvedValue([[baseNotif], 42]);

      const result = await service.getNotifications('user-1', 10, 0);

      expect(result.total).toBe(42);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0]).toMatchObject({
        notificationId: 'notif-1',
        isRead: false,
      });
    });
  });

  // ─── deleteNotification ──────────────────────────────────────────────────────

  describe('deleteNotification', () => {
    it('should call repo.deleteNotification with correct params', async () => {
      mockNotificationsRepository.deleteNotification.mockResolvedValue(undefined);

      await service.deleteNotification('recipient-1', 'actor-1', NotificationType.NEW_LIKE);

      expect(repo.deleteNotification).toHaveBeenCalledWith(
        'recipient-1',
        'actor-1',
        NotificationType.NEW_LIKE
      );
    });
  });

  // ─── markAllAsRead ───────────────────────────────────────────────────────────

  describe('markAllAsRead', () => {
    it('should call repo.markAllAsRead with userId', async () => {
      mockNotificationsRepository.markAllAsRead.mockResolvedValue(undefined);

      await service.markAllAsRead('user-1');

      expect(repo.markAllAsRead).toHaveBeenCalledWith('user-1');
    });
  });

  // ─── notifyNewLike ───────────────────────────────────────────────────────────

  describe('notifyNewLike', () => {
    const actor = { userId: 'actor-1', username: 'alice', avatarUrl: null };
    const target = { trackId: 'track-1' };
    const mockNotif = {
      notificationId: 'notif-like',
      type: NotificationType.NEW_LIKE,
      createdAt: new Date(),
    };

    beforeEach(() => {
      mockNotificationsRepository.createNotification.mockResolvedValue(mockNotif);
      mockNotificationsRepository.getUnreadCount.mockResolvedValue(3);
      mockSettingsService.getNotificationSettings.mockResolvedValue({ data: { device: {} } });
      mockNotificationsRepository.getUserDeviceTokens.mockResolvedValue([]);
    });

    it('should create notification and emit websocket event with correct type and target', async () => {
      await service.notifyNewLike('recipient-1', actor, target);

      expect(repo.createNotification).toHaveBeenCalledWith(
        NotificationType.NEW_LIKE,
        'recipient-1',
        actor.userId,
        target
      );
      expect(websocketsService.emitToUser).toHaveBeenCalledWith(
        'recipient-1',
        'new_notification',
        expect.objectContaining({
          notification: expect.objectContaining({
            type: NotificationType.NEW_LIKE,
            target,
          }),
          unreadCount: 3,
        })
      );
    });

    it('should not throw when no device tokens exist (push is best-effort)', async () => {
      mockNotificationsRepository.getUserDeviceTokens.mockResolvedValue([]);

      await expect(service.notifyNewLike('recipient-1', actor, target)).resolves.not.toThrow();
    });
  });

  // ─── notifyNewRepost ─────────────────────────────────────────────────────────

  describe('notifyNewRepost', () => {
    const actor = { userId: 'actor-1', username: 'bob', avatarUrl: null };
    const target = { trackId: 'track-2' };
    const mockNotif = {
      notificationId: 'notif-repost',
      type: NotificationType.NEW_REPOST,
      createdAt: new Date(),
    };

    beforeEach(() => {
      mockNotificationsRepository.createNotification.mockResolvedValue(mockNotif);
      mockNotificationsRepository.getUnreadCount.mockResolvedValue(1);
      mockSettingsService.getNotificationSettings.mockResolvedValue({ data: { device: {} } });
      mockNotificationsRepository.getUserDeviceTokens.mockResolvedValue([]);
    });

    it('should create notification and emit websocket event with NEW_REPOST type', async () => {
      await service.notifyNewRepost('recipient-1', actor, target);

      expect(repo.createNotification).toHaveBeenCalledWith(
        NotificationType.NEW_REPOST,
        'recipient-1',
        actor.userId,
        target
      );
      expect(websocketsService.emitToUser).toHaveBeenCalledWith(
        'recipient-1',
        'new_notification',
        expect.objectContaining({
          notification: expect.objectContaining({
            type: NotificationType.NEW_REPOST,
          }),
        })
      );
    });
  });

  // ─── notifyNewComment ────────────────────────────────────────────────────────

  describe('notifyNewComment', () => {
    const actor = { userId: 'actor-1', username: 'charlie', avatarUrl: null };
    const target = { trackId: 'track-3', commentId: 'comment-1', content: 'Great track!' };
    const mockNotif = {
      notificationId: 'notif-comment',
      type: NotificationType.NEW_COMMENT,
      createdAt: new Date(),
    };

    beforeEach(() => {
      mockNotificationsRepository.createNotification.mockResolvedValue(mockNotif);
      mockNotificationsRepository.getUnreadCount.mockResolvedValue(2);
      mockSettingsService.getNotificationSettings.mockResolvedValue({ data: { device: {} } });
      mockNotificationsRepository.getUserDeviceTokens.mockResolvedValue([]);
    });

    it('should create notification and emit websocket event with NEW_COMMENT type', async () => {
      await service.notifyNewComment('recipient-1', actor, target);

      expect(repo.createNotification).toHaveBeenCalledWith(
        NotificationType.NEW_COMMENT,
        'recipient-1',
        actor.userId,
        { trackId: target.trackId }
      );
      expect(websocketsService.emitToUser).toHaveBeenCalledWith(
        'recipient-1',
        'new_notification',
        expect.objectContaining({
          notification: expect.objectContaining({
            type: NotificationType.NEW_COMMENT,
          }),
        })
      );
    });

    it('should set isReply in the websocket payload when isReply=true', async () => {
      await service.notifyNewComment('recipient-1', actor, target, true);

      expect(websocketsService.emitToUser).toHaveBeenCalledWith(
        'recipient-1',
        'new_notification',
        expect.objectContaining({
          notification: expect.objectContaining({
            target: expect.objectContaining({ isReply: true }),
          }),
        })
      );
    });
  });

  // ─── notifyNewPost ───────────────────────────────────────────────────────────

  describe('notifyNewPost', () => {
    const artist = { userId: 'artist-1', username: 'dj-star', avatarUrl: null };
    const mockNotif = {
      notificationId: 'notif-post',
      type: NotificationType.NEW_POST,
      createdAt: new Date(),
    };

    beforeEach(() => {
      mockNotificationsRepository.createNotification.mockResolvedValue(mockNotif);
      mockNotificationsRepository.getUnreadCount.mockResolvedValue(0);
      mockSettingsService.getNotificationSettings.mockResolvedValue({ data: { device: {} } });
      mockNotificationsRepository.getUserDeviceTokens.mockResolvedValue([]);
    });

    it('should call createNotification and emitToUser for each follower', async () => {
      mockNotificationsRepository.getFollowers.mockResolvedValue(['follower-1', 'follower-2']);

      await service.notifyNewPost(artist, 'track-4');

      expect(repo.createNotification).toHaveBeenCalledTimes(2);
      expect(websocketsService.emitToUser).toHaveBeenCalledTimes(2);
      expect(websocketsService.emitToUser).toHaveBeenCalledWith(
        'follower-1',
        'new_notification',
        expect.objectContaining({
          notification: expect.objectContaining({ type: NotificationType.NEW_POST }),
        })
      );
    });

    it('should do nothing when followers array is empty', async () => {
      mockNotificationsRepository.getFollowers.mockResolvedValue([]);

      await service.notifyNewPost(artist, 'track-5');

      expect(repo.createNotification).not.toHaveBeenCalled();
      expect(websocketsService.emitToUser).not.toHaveBeenCalled();
    });
  });

  // ─── registerDevice ──────────────────────────────────────────────────────────

  describe('registerDevice', () => {
    it('should delegate to repo.saveDeviceToken with userId, token, platform', async () => {
      mockNotificationsRepository.saveDeviceToken.mockResolvedValue({ id: 'dt-1' });

      const result = await service.registerDevice('user-1', 'fcm-token-xyz', 'android');

      expect(repo.saveDeviceToken).toHaveBeenCalledWith('user-1', 'fcm-token-xyz', 'android');
      expect(result).toEqual({ id: 'dt-1' });
    });
  });
});
