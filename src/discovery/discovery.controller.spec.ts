import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';
import { FollowersRepository } from '../followers/followers.repository';
import { ActivityService } from '../activity/activity.service';
import { TrackRepository } from '../track/track.repository';
import { TrackService } from '../track/track.service';
import { PlaylistRepository } from '../playlist/playlist.repository';

describe('DiscoveryController', () => {
  let controller: DiscoveryController;
  let discoveryService: DiscoveryService;

  const mockDiscoveryService = {
    getFeed: jest.fn(),
    getTrackStation: jest.fn(),
    getUserRecentActivities: jest.fn(),
    getArtistStation: jest.fn(),
  };

  const mockUserId = 'user-123';
  const mockIp = '192.168.1.1';
  const mockUsername = 'artist-user';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscoveryController],
      providers: [
        { provide: DiscoveryService, useValue: mockDiscoveryService },
        { provide: FollowersRepository, useValue: {} },
        { provide: ActivityService, useValue: {} },
        { provide: TrackRepository, useValue: {} },
        { provide: TrackService, useValue: {} },
        { provide: PlaylistRepository, useValue: {} },
      ],
    }).compile();

    controller = module.get<DiscoveryController>(DiscoveryController);
    discoveryService = module.get<DiscoveryService>(DiscoveryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFeed', () => {
    it('should call discoveryService.getFeed with correct parameters', async () => {
      const mockFeed = [
        {
          activityId: 'activity-1',
          activityType: 'TRACK_POSTED',
          userId: 'user-1',
          targetId: 'track-1',
          target: {
            trackId: 'track-1',
            title: 'Test Track',
            audioUrl: 'http://example.com/track.mp3',
          },
        },
      ];

      mockDiscoveryService.getFeed.mockResolvedValue(mockFeed);

      const result = await controller.getFeed(mockUserId, mockIp, true, 1, 20);

      expect(discoveryService.getFeed).toHaveBeenCalledWith(mockUserId, mockIp, true, 1, 20);
      expect(discoveryService.getFeed).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockFeed);
    });

    it('should use default pagination values when not provided', async () => {
      const mockFeed: any[] = [];

      mockDiscoveryService.getFeed.mockResolvedValue(mockFeed);

      await controller.getFeed(mockUserId, mockIp, false, undefined, undefined);

      expect(discoveryService.getFeed).toHaveBeenCalledWith(mockUserId, mockIp, false, 1, 20);
    });

    it('should handle includeReposts parameter correctly', async () => {
      const mockFeed: any[] = [];
      mockDiscoveryService.getFeed.mockResolvedValue(mockFeed);

      await controller.getFeed(mockUserId, mockIp, false, 1, 20);

      expect(discoveryService.getFeed).toHaveBeenCalledWith(mockUserId, mockIp, false, 1, 20);
    });

    it('should handle custom pagination parameters', async () => {
      const mockFeed = [
        {
          activityId: 'activity-1',
          activityType: 'PLAYLIST_POSTED',
          userId: 'user-1',
          targetId: 'playlist-1',
          target: {
            playlistId: 'playlist-1',
            title: 'Test Playlist',
          },
        },
      ];

      mockDiscoveryService.getFeed.mockResolvedValue(mockFeed);

      const result = await controller.getFeed(mockUserId, mockIp, true, 3, 50);

      expect(discoveryService.getFeed).toHaveBeenCalledWith(mockUserId, mockIp, true, 3, 50);
      expect(result).toEqual(mockFeed);
    });

    it('should return activities with blocked tracks when region-blocked', async () => {
      const mockFeed = [
        {
          activityId: 'activity-1',
          activityType: 'TRACK_POSTED',
          userId: 'user-1',
          targetId: 'track-1',
          target: {
            trackId: 'track-1',
            title: 'Blocked Track',
            coverImage: 'http://example.com/cover.jpg',
            isBlocked: true,
            audioUrl: null,
          },
        },
      ];

      mockDiscoveryService.getFeed.mockResolvedValue(mockFeed);

      const result = await controller.getFeed(mockUserId, mockIp, true, 1, 20);

      expect(result).toEqual(mockFeed);
      expect((result as any)[0].target.audioUrl).toBeNull();
      expect((result as any)[0].target.isBlocked).toBe(true);
    });

    it('should propagate errors from service', async () => {
      const error = new Error('Feed retrieval failed');
      mockDiscoveryService.getFeed.mockRejectedValue(error);

      await expect(controller.getFeed(mockUserId, mockIp, true, 1, 20)).rejects.toThrow(
        'Feed retrieval failed'
      );
    });
  });

  describe('getUserRecentActivities', () => {
    it('should call discoveryService.getUserRecentActivities with correct parameters', async () => {
      const mockActivities = [
        {
          activityId: 'activity-1',
          activityType: 'TRACK_POSTED',
          userId: 'user-1',
          targetId: 'track-1',
          target: {
            trackId: 'track-1',
            title: 'User Track',
          },
        },
      ];

      mockDiscoveryService.getUserRecentActivities.mockResolvedValue(mockActivities);

      const result = await controller.getUserRecentActivities(
        mockUserId,
        mockIp,
        mockUsername,
        1,
        20
      );

      expect(discoveryService.getUserRecentActivities).toHaveBeenCalledWith(
        mockUserId,
        mockUsername,
        mockIp,
        1,
        20
      );
      expect(discoveryService.getUserRecentActivities).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockActivities);
    });

    it('should use default pagination values when not provided', async () => {
      const mockActivities: any[] = [];

      mockDiscoveryService.getUserRecentActivities.mockResolvedValue(mockActivities);

      await controller.getUserRecentActivities(
        mockUserId,
        mockIp,
        mockUsername,
        undefined,
        undefined
      );

      expect(discoveryService.getUserRecentActivities).toHaveBeenCalledWith(
        mockUserId,
        mockUsername,
        mockIp,
        1,
        20
      );
    });

    it('should handle custom pagination parameters', async () => {
      const mockActivities: any[] = [];

      mockDiscoveryService.getUserRecentActivities.mockResolvedValue(mockActivities);

      const result = await controller.getUserRecentActivities(
        mockUserId,
        mockIp,
        mockUsername,
        2,
        10
      );

      expect(discoveryService.getUserRecentActivities).toHaveBeenCalledWith(
        mockUserId,
        mockUsername,
        mockIp,
        2,
        10
      );
      expect(result).toEqual(mockActivities);
    });

    it('should handle different usernames correctly', async () => {
      const mockActivities: any[] = [];
      mockDiscoveryService.getUserRecentActivities.mockResolvedValue(mockActivities);

      await controller.getUserRecentActivities(mockUserId, mockIp, 'different-user', 1, 20);

      expect(discoveryService.getUserRecentActivities).toHaveBeenCalledWith(
        mockUserId,
        'different-user',
        mockIp,
        1,
        20
      );
    });

    it('should return activities with region-blocked content censored', async () => {
      const mockActivities = [
        {
          activityId: 'activity-1',
          activityType: 'TRACK_POSTED',
          userId: 'user-1',
          targetId: 'track-1',
          target: {
            trackId: 'track-1',
            title: 'Blocked Track',
            isBlocked: true,
            audioUrl: null,
          },
        },
      ];

      mockDiscoveryService.getUserRecentActivities.mockResolvedValue(mockActivities);

      const result = await controller.getUserRecentActivities(
        mockUserId,
        mockIp,
        mockUsername,
        1,
        20
      );

      expect((result as any)[0].target.audioUrl).toBeNull();
      expect((result as any)[0].target.isBlocked).toBe(true);
    });

    it('should propagate errors from service when user not found', async () => {
      const error = new Error('User not found');
      mockDiscoveryService.getUserRecentActivities.mockRejectedValue(error);

      await expect(
        controller.getUserRecentActivities(mockUserId, mockIp, mockUsername, 1, 20)
      ).rejects.toThrow('User not found');
    });

    it('should propagate errors from service when user activities are private', async () => {
      const error = new Error('User activities are private');
      mockDiscoveryService.getUserRecentActivities.mockRejectedValue(error);

      await expect(
        controller.getUserRecentActivities(mockUserId, mockIp, mockUsername, 1, 20)
      ).rejects.toThrow('User activities are private');
    });
  });

  describe('getTrackStation', () => {
    const mockArtistUsername = 'artist-user';
    const mockTrackName = 'awesome-track';

    it('should call discoveryService.getTrackStation with correct parameters', async () => {
      const mockStation = {
        status: 'success',
        data: {
          playlistId: 'playlist-123',
          title: 'Track Station: awesome-track',
          description: null,
          coverImage: 'http://example.com/cover.jpg',
          tracksCount: 50,
          durationSeconds: 15000,
          likesCount: 0,
          createdAt: new Date(),
          trackArtist: {
            userId: 'user-1',
            username: 'artist-user',
            displayName: 'Artist User',
            avatarUrl: 'http://example.com/avatar.jpg',
          },
          tracks: [
            {
              position: 1,
              trackId: 'track-1',
              title: 'awesome-track',
              durationSeconds: 300,
              coverImage: 'http://example.com/cover.jpg',
              audioUrl: 'http://example.com/audio.mp3',
              waveformUrl: 'http://example.com/waveform.json',
              playCount: 100,
              likesCount: 10,
              repostsCount: 5,
              commentsCount: 2,
              artist: {
                userId: 'user-1',
                username: 'artist-user',
                displayName: 'Artist User',
                avatarUrl: 'http://example.com/avatar.jpg',
              },
            },
          ],
          featuredArtists: [
            {
              userId: 'user-1',
              username: 'artist-user',
              displayName: 'Artist User',
              avatarUrl: 'http://example.com/avatar.jpg',
              trackCount: 10,
              followersCount: 100,
              isFollowedByCurrentUser: false,
            },
          ],
        },
      };

      mockDiscoveryService.getTrackStation.mockResolvedValue(mockStation);

      const result = await controller.getTrackStation(
        mockUserId,
        mockArtistUsername,
        mockTrackName,
        mockIp
      );

      expect(discoveryService.getTrackStation).toHaveBeenCalledWith(
        mockArtistUsername,
        mockTrackName,
        mockUserId,
        mockIp
      );
      expect(discoveryService.getTrackStation).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockStation);
    });

    it('should handle different artist usernames', async () => {
      const mockStation = {
        status: 'success',
        data: {
          playlistId: 'playlist-456',
          title: 'Track Station',
          tracks: [],
          featuredArtists: [],
        },
      };
      mockDiscoveryService.getTrackStation.mockResolvedValue(mockStation);

      await controller.getTrackStation(mockUserId, 'different-artist', mockTrackName, mockIp);

      expect(discoveryService.getTrackStation).toHaveBeenCalledWith(
        'different-artist',
        mockTrackName,
        mockUserId,
        mockIp
      );
    });

    it('should handle different track names', async () => {
      const mockStation = {
        status: 'success',
        data: {
          playlistId: 'playlist-789',
          title: 'Track Station',
          tracks: [],
          featuredArtists: [],
        },
      };
      mockDiscoveryService.getTrackStation.mockResolvedValue(mockStation);

      await controller.getTrackStation(mockUserId, mockArtistUsername, 'different-track', mockIp);

      expect(discoveryService.getTrackStation).toHaveBeenCalledWith(
        mockArtistUsername,
        'different-track',
        mockUserId,
        mockIp
      );
    });

    it('should handle track names with special characters', async () => {
      const specialTrackName = 'track-with-dashes-and_underscores';
      const mockStation = {
        status: 'success',
        data: {
          playlistId: 'playlist-special',
          title: 'Track Station',
          tracks: [],
          featuredArtists: [],
        },
      };
      mockDiscoveryService.getTrackStation.mockResolvedValue(mockStation);

      await controller.getTrackStation(mockUserId, mockArtistUsername, specialTrackName, mockIp);

      expect(discoveryService.getTrackStation).toHaveBeenCalledWith(
        mockArtistUsername,
        specialTrackName,
        mockUserId,
        mockIp
      );
    });

    it('should return station with region-blocked tracks censored', async () => {
      const mockStation = {
        status: 'success',
        data: {
          playlistId: 'playlist-123',
          title: 'Track Station',
          tracks: [
            {
              position: 1,
              trackId: 'track-1',
              title: 'Blocked Track',
              audioUrl: null,
              waveformUrl: null,
            },
          ],
          featuredArtists: [],
        },
      };

      mockDiscoveryService.getTrackStation.mockResolvedValue(mockStation);

      const result = await controller.getTrackStation(
        mockUserId,
        mockArtistUsername,
        mockTrackName,
        mockIp
      );

      expect(result.data.tracks[0].audioUrl).toBeNull();
      expect(result.data.tracks[0].waveformUrl).toBeNull();
    });

    it('should propagate NotFoundException when track not found', async () => {
      const error = new Error('Track not found');
      error.name = 'NotFoundException';
      mockDiscoveryService.getTrackStation.mockRejectedValue(error);

      await expect(
        controller.getTrackStation(mockUserId, mockArtistUsername, mockTrackName, mockIp)
      ).rejects.toThrow('Track not found');
    });

    it('should propagate ForbiddenException when track is not accessible', async () => {
      const error = new Error('Track is not accessible');
      error.name = 'ForbiddenException';
      mockDiscoveryService.getTrackStation.mockRejectedValue(error);

      await expect(
        controller.getTrackStation(mockUserId, mockArtistUsername, mockTrackName, mockIp)
      ).rejects.toThrow('Track is not accessible');
    });

    it('should return featured artists with follow status', async () => {
      const mockStation = {
        status: 'success',
        data: {
          playlistId: 'playlist-123',
          title: 'Track Station',
          tracks: [],
          featuredArtists: [
            {
              userId: 'artist-1',
              username: 'artist1',
              displayName: 'Artist One',
              avatarUrl: 'http://example.com/avatar1.jpg',
              trackCount: 15,
              followersCount: 250,
              isFollowedByCurrentUser: true,
            },
            {
              userId: 'artist-2',
              username: 'artist2',
              displayName: 'Artist Two',
              avatarUrl: 'http://example.com/avatar2.jpg',
              trackCount: 8,
              followersCount: 120,
              isFollowedByCurrentUser: false,
            },
          ],
        },
      };

      mockDiscoveryService.getTrackStation.mockResolvedValue(mockStation);

      const result = await controller.getTrackStation(
        mockUserId,
        mockArtistUsername,
        mockTrackName,
        mockIp
      );

      expect(result.data.featuredArtists).toHaveLength(2);
      expect(result.data.featuredArtists[0].isFollowedByCurrentUser).toBe(true);
      expect(result.data.featuredArtists[1].isFollowedByCurrentUser).toBe(false);
    });

    it('should handle empty station with no tracks', async () => {
      const mockStation = {
        status: 'success',
        data: {
          playlistId: 'playlist-123',
          title: 'Track Station',
          tracksCount: 0,
          tracks: [],
          featuredArtists: [],
        },
      };

      mockDiscoveryService.getTrackStation.mockResolvedValue(mockStation);

      const result = await controller.getTrackStation(
        mockUserId,
        mockArtistUsername,
        mockTrackName,
        mockIp
      );

      expect(result.data.tracks).toHaveLength(0);
      expect(result.data.featuredArtists).toHaveLength(0);
    });
  });

  describe('getArtistStation', () => {
    it('should call discoveryService.getArtistStation with correct parameters', async () => {
      const mockStation = {
        status: 'success',
        data: {
          playlistId: 'playlist-123',
          title: 'artist-user Station',
          description: null,
          coverImage: 'http://example.com/avatar.jpg',
          tracksCount: 50,
          durationSeconds: 15000,
          likesCount: 100,
          createdAt: new Date(),
          trackArtist: {
            userId: 'user-1',
            username: 'artist-user',
            displayName: 'Artist User',
            avatarUrl: 'http://example.com/avatar.jpg',
          },
          tracks: [
            {
              position: 1,
              trackId: 'track-1',
              title: 'Popular Track',
              durationSeconds: 300,
              coverImage: 'http://example.com/cover.jpg',
              audioUrl: 'http://example.com/audio.mp3',
              waveformUrl: 'http://example.com/waveform.json',
              playCount: 1000,
              likesCount: 50,
              repostsCount: 10,
              commentsCount: 5,
              artist: {
                userId: 'user-1',
                username: 'artist-user',
                displayName: 'Artist User',
                avatarUrl: 'http://example.com/avatar.jpg',
              },
            },
          ],
          featuredArtists: [
            {
              userId: 'user-1',
              username: 'artist-user',
              displayName: 'Artist User',
              avatarUrl: 'http://example.com/avatar.jpg',
              trackCount: 25,
              followersCount: 500,
              isFollowedByCurrentUser: false,
            },
          ],
        },
      };

      mockDiscoveryService.getArtistStation.mockResolvedValue(mockStation);

      const result = await controller.getArtistStation(mockUserId, mockUsername, mockIp);

      expect(discoveryService.getArtistStation).toHaveBeenCalledWith(
        mockUsername,
        mockUserId,
        mockIp
      );
      expect(discoveryService.getArtistStation).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockStation);
    });

    it('should handle different usernames', async () => {
      const mockStation = {
        status: 'success',
        data: {
          playlistId: 'playlist-456',
          title: 'different-artist Station',
          tracks: [],
          featuredArtists: [],
        },
      };

      mockDiscoveryService.getArtistStation.mockResolvedValue(mockStation);

      await controller.getArtistStation(mockUserId, 'different-artist', mockIp);

      expect(discoveryService.getArtistStation).toHaveBeenCalledWith(
        'different-artist',
        mockUserId,
        mockIp
      );
    });

    it('should propagate NotFoundException when user not found', async () => {
      const error = new NotFoundException('User not found');
      mockDiscoveryService.getArtistStation.mockRejectedValue(error);

      await expect(
        controller.getArtistStation(mockUserId, 'nonexistent-user', mockIp)
      ).rejects.toThrow(NotFoundException);

      await expect(
        controller.getArtistStation(mockUserId, 'nonexistent-user', mockIp)
      ).rejects.toThrow('User not found');
    });

    it('should propagate ForbiddenException when user is private', async () => {
      const error = new ForbiddenException('User is private');
      mockDiscoveryService.getArtistStation.mockRejectedValue(error);

      await expect(controller.getArtistStation(mockUserId, 'private-user', mockIp)).rejects.toThrow(
        ForbiddenException
      );

      await expect(controller.getArtistStation(mockUserId, 'private-user', mockIp)).rejects.toThrow(
        'User is private'
      );
    });

    it('should return station with featured artists and follow status', async () => {
      const mockStation = {
        status: 'success',
        data: {
          playlistId: 'playlist-123',
          title: 'Artist Station',
          tracks: [],
          featuredArtists: [
            {
              userId: 'artist-1',
              username: 'featured1',
              displayName: 'Featured Artist 1',
              avatarUrl: 'http://example.com/avatar1.jpg',
              trackCount: 15,
              followersCount: 200,
              isFollowedByCurrentUser: true,
            },
            {
              userId: 'artist-2',
              username: 'featured2',
              displayName: 'Featured Artist 2',
              avatarUrl: 'http://example.com/avatar2.jpg',
              trackCount: 8,
              followersCount: 100,
              isFollowedByCurrentUser: false,
            },
          ],
        },
      };

      mockDiscoveryService.getArtistStation.mockResolvedValue(mockStation);

      const result = await controller.getArtistStation(mockUserId, mockUsername, mockIp);

      expect(result.data.featuredArtists).toHaveLength(2);
      expect(result.data.featuredArtists[0].isFollowedByCurrentUser).toBe(true);
      expect(result.data.featuredArtists[1].isFollowedByCurrentUser).toBe(false);
    });

    it('should return station with region-blocked tracks censored', async () => {
      const mockStation = {
        status: 'success',
        data: {
          playlistId: 'playlist-123',
          title: 'Artist Station',
          tracks: [
            {
              position: 1,
              trackId: 'track-1',
              title: 'Blocked Track',
              audioUrl: null,
              waveformUrl: null,
            },
            {
              position: 2,
              trackId: 'track-2',
              title: 'Available Track',
              audioUrl: 'http://example.com/audio.mp3',
              waveformUrl: 'http://example.com/waveform.json',
            },
          ],
          featuredArtists: [],
        },
      };

      mockDiscoveryService.getArtistStation.mockResolvedValue(mockStation);

      const result = await controller.getArtistStation(mockUserId, mockUsername, mockIp);

      expect(result.data.tracks[0].audioUrl).toBeNull();
      expect(result.data.tracks[0].waveformUrl).toBeNull();
      expect(result.data.tracks[1].audioUrl).not.toBeNull();
    });

    it('should handle artist with no tracks gracefully', async () => {
      const mockStation = {
        status: 'success',
        data: {
          playlistId: 'playlist-empty',
          title: 'Empty Artist Station',
          tracksCount: 0,
          tracks: [],
          featuredArtists: [],
        },
      };

      mockDiscoveryService.getArtistStation.mockResolvedValue(mockStation);

      const result = await controller.getArtistStation(mockUserId, mockUsername, mockIp);

      expect(result.data.tracks).toHaveLength(0);
      expect(result.data.tracksCount).toBe(0);
    });

    it('should handle different IP addresses for geolocation', async () => {
      const mockStation = {
        status: 'success',
        data: {
          playlistId: 'playlist-123',
          title: 'Artist Station',
          tracks: [],
          featuredArtists: [],
        },
      };

      mockDiscoveryService.getArtistStation.mockResolvedValue(mockStation);

      const differentIp = '82.45.123.45'; // UK IP
      await controller.getArtistStation(mockUserId, mockUsername, differentIp);

      expect(discoveryService.getArtistStation).toHaveBeenCalledWith(
        mockUsername,
        mockUserId,
        differentIp
      );
    });

    it('should propagate generic errors from service', async () => {
      const error = new Error('Database connection failed');
      mockDiscoveryService.getArtistStation.mockRejectedValue(error);

      await expect(controller.getArtistStation(mockUserId, mockUsername, mockIp)).rejects.toThrow(
        'Database connection failed'
      );
    });
  });
});
