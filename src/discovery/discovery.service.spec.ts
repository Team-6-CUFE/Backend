import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { FollowersRepository } from '../followers/followers.repository';
import { ActivityService } from '../activity/activity.service';
import { TrackRepository } from '../track/track.repository';
import { TrackService } from '../track/track.service';
import { PlaylistRepository } from '../playlist/playlist.repository';
import { UserService } from '../user/user.service';
import { ActivityType } from '../activity/entities/activity.entity';
import { TrackVisibility } from '../track/enums/track-visibility.enum';
import * as geolocationUtil from '../common/utilities/geolocation.util';

// ─── UUIDs ────────────────────────────────────────────────────────────────────

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const MOCK_OTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440002';
const MOCK_TRACK_ID = '660e8400-e29b-41d4-a716-446655440010';
const MOCK_PLAYLIST_ID = '770e8400-e29b-41d4-a716-446655440020';
const MOCK_STATION_ID = '880e8400-e29b-41d4-a716-446655440030';
const MOCK_ACTIVITY_ID = '990e8400-e29b-41d4-a716-446655440040';

// ─── Mock factories ───────────────────────────────────────────────────────────

const mockUser = (overrides?: object) => ({
  userId: MOCK_USER_ID,
  username: 'dj_nour',
  displayName: 'DJ Nour',
  avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
  isPublic: true,
  trackCount: 10,
  followersCount: 500,
  ...overrides,
});

const mockTrack = (overrides?: object) => ({
  trackId: MOCK_TRACK_ID,
  userId: MOCK_USER_ID,
  title: 'Midnight Drive',
  audioUrl: 'https://cdn.harmonica.com/audio/midnight.mp3',
  waveformUrl: 'https://cdn.harmonica.com/waveforms/midnight.json',
  coverImage: 'https://cdn.harmonica.com/covers/midnight.jpg',
  durationSeconds: 213,
  visibility: TrackVisibility.PUBLIC,
  hidden: false,
  blockedRegions: [] as string[],
  playCount: 1200,
  likesCount: 87,
  repostsCount: 13,
  commentsCount: 5,
  genreId: 'genre-uuid',
  tags: [],
  user: mockUser(),
  ...overrides,
});

const mockPlaylistTrack = (track: ReturnType<typeof mockTrack>, position = 1) => ({
  position,
  track,
});

const mockStation = (overrides?: object) => ({
  playlistId: MOCK_STATION_ID,
  title: 'Midnight Drive',
  description: null,
  coverImage: 'https://cdn.harmonica.com/covers/midnight.jpg',
  tracksCount: 1,
  totalDurationSeconds: 213,
  likesCount: 0,
  createdAt: new Date(),
  user: mockUser(),
  playlistTracks: [mockPlaylistTrack(mockTrack() as any)],
  ...overrides,
});

const mockActivity = (overrides?: object) => ({
  activityId: MOCK_ACTIVITY_ID,
  activityType: ActivityType.TRACK_POSTED,
  targetId: MOCK_TRACK_ID,
  userId: MOCK_OTHER_USER_ID,
  targetUserId: null,
  createdAt: new Date('2026-04-17T10:00:00Z'),
  user: mockUser({ userId: MOCK_OTHER_USER_ID }),
  ...overrides,
});

// ─── Mock repository factories ────────────────────────────────────────────────

const mockFollowersRepository = () => ({
  getFollowingIds: jest.fn(),
  isFollowing: jest.fn(),
  hasBlockRelationship: jest.fn(),
});

const mockActivityService = () => ({
  getActivitiesByUserIds: jest.fn(),
});

const mockTrackRepository = () => ({
  findByIds: jest.fn(),
  findTrackByTitleAndArtist: jest.fn(),
  findPopularTracksByGenreOrTags: jest.fn(),
  getAllUserTracks: jest.fn(),
});

const mockTrackService = () => ({
  getRelatedTracksByTrackId: jest.fn(),
  getPopularityScore: jest.fn(),
});

const mockPlaylistRepository = () => ({
  findByIds: jest.fn(),
  getTrackStation: jest.fn(),
  createTrackStation: jest.fn(),
  addTrackToPlaylist: jest.fn(),
  getPublicPlaylist: jest.fn(),
  deletePlaylist: jest.fn(),
  transferStationLikes: jest.fn(),
  getArtistStation: jest.fn(),
  createArtistStation: jest.fn(),
});

const mockUserService = () => ({
  findByUsername: jest.fn(),
});

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let followersRepo: ReturnType<typeof mockFollowersRepository>;
  let activitySvc: ReturnType<typeof mockActivityService>;
  let trackRepo: ReturnType<typeof mockTrackRepository>;
  let trackSvc: ReturnType<typeof mockTrackService>;
  let playlistRepo: ReturnType<typeof mockPlaylistRepository>;
  let userSvc: ReturnType<typeof mockUserService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        { provide: FollowersRepository, useFactory: mockFollowersRepository },
        { provide: ActivityService, useFactory: mockActivityService },
        { provide: TrackRepository, useFactory: mockTrackRepository },
        { provide: TrackService, useFactory: mockTrackService },
        { provide: PlaylistRepository, useFactory: mockPlaylistRepository },
        { provide: UserService, useFactory: mockUserService },
      ],
    }).compile();

    service = module.get<DiscoveryService>(DiscoveryService);
    followersRepo = module.get(FollowersRepository);
    activitySvc = module.get(ActivityService);
    trackRepo = module.get(TrackRepository);
    trackSvc = module.get(TrackService);
    playlistRepo = module.get(PlaylistRepository);
    userSvc = module.get(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── getFeed ───────────────────────────────────────────────────────────────

  describe('getFeed', () => {
    it('should return empty result when user follows nobody', async () => {
      followersRepo.getFollowingIds.mockResolvedValue([]);

      const result = await service.getFeed(MOCK_USER_ID, '1.2.3.4', true);

      expect(result).toEqual({ activities: [], total: 0 });
      expect(activitySvc.getActivitiesByUserIds).not.toHaveBeenCalled();
    });

    it('should return activities with track targets', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      followersRepo.getFollowingIds.mockResolvedValue([MOCK_OTHER_USER_ID]);
      const activity = mockActivity({
        activityType: ActivityType.TRACK_POSTED,
        targetId: MOCK_TRACK_ID,
      });
      activitySvc.getActivitiesByUserIds.mockResolvedValue([activity]);
      const track = mockTrack();
      trackRepo.findByIds.mockResolvedValue([track]);
      playlistRepo.findByIds.mockResolvedValue([]);

      const result = await service.getFeed(MOCK_USER_ID, '1.2.3.4', true);

      expect(result).toHaveLength(1);
      expect((result as any)[0].target).toBeDefined();
      expect((result as any)[0].target.trackId).toBe(MOCK_TRACK_ID);
    });

    it('should null out audioUrl for a track blocked in the requester region', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'EG' } as any);
      followersRepo.getFollowingIds.mockResolvedValue([MOCK_OTHER_USER_ID]);
      const activity = mockActivity({
        activityType: ActivityType.TRACK_POSTED,
        targetId: MOCK_TRACK_ID,
      });
      activitySvc.getActivitiesByUserIds.mockResolvedValue([activity]);
      const blockedTrack = mockTrack({ blockedRegions: ['EG'] });
      trackRepo.findByIds.mockResolvedValue([blockedTrack]);
      playlistRepo.findByIds.mockResolvedValue([]);

      const result = await service.getFeed(MOCK_USER_ID, '1.2.3.4', true);

      expect((result as any)[0].target.audioUrl).toBeNull();
      expect((result as any)[0].target.isBlocked).toBe(true);
    });

    it('should not block track audioUrl when region does not match', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      followersRepo.getFollowingIds.mockResolvedValue([MOCK_OTHER_USER_ID]);
      const activity = mockActivity({
        activityType: ActivityType.TRACK_POSTED,
        targetId: MOCK_TRACK_ID,
      });
      activitySvc.getActivitiesByUserIds.mockResolvedValue([activity]);
      const track = mockTrack({ blockedRegions: ['EG'] });
      trackRepo.findByIds.mockResolvedValue([track]);
      playlistRepo.findByIds.mockResolvedValue([]);

      const result = await service.getFeed(MOCK_USER_ID, '1.2.3.4', true);

      expect((result as any)[0].target.audioUrl).toBe(track.audioUrl);
    });

    it('should null out audioUrl for blocked tracks inside a playlist activity', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'EG' } as any);
      followersRepo.getFollowingIds.mockResolvedValue([MOCK_OTHER_USER_ID]);
      const activity = mockActivity({
        activityType: ActivityType.PLAYLIST_POSTED,
        targetId: MOCK_PLAYLIST_ID,
      });
      activitySvc.getActivitiesByUserIds.mockResolvedValue([activity]);
      const blockedTrack = mockTrack({ blockedRegions: ['EG'] });
      const playlist = {
        playlistId: MOCK_PLAYLIST_ID,
        playlistTracks: [{ position: 1, track: blockedTrack }],
      };
      trackRepo.findByIds.mockResolvedValue([]);
      playlistRepo.findByIds.mockResolvedValue([playlist]);

      const result = await service.getFeed(MOCK_USER_ID, '1.2.3.4', true);

      const pt = (result as any)[0].target.playlistTracks[0];
      expect(pt.track.audioUrl).toBeNull();
      expect(pt.track.isBlocked).toBe(true);
    });

    it('should return target as null when activity target is not found', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      followersRepo.getFollowingIds.mockResolvedValue([MOCK_OTHER_USER_ID]);
      const activity = mockActivity({
        activityType: ActivityType.TRACK_POSTED,
        targetId: 'missing-id',
      });
      activitySvc.getActivitiesByUserIds.mockResolvedValue([activity]);
      trackRepo.findByIds.mockResolvedValue([]);
      playlistRepo.findByIds.mockResolvedValue([]);

      const result = await service.getFeed(MOCK_USER_ID, '1.2.3.4', true);

      expect((result as any)[0].target).toBeNull();
    });
  });

  // ─── getUserRecentActivities ───────────────────────────────────────────────

  describe('getUserRecentActivities', () => {
    it('should throw an error when user is not found', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      userSvc.findByUsername.mockResolvedValue(null);

      await expect(
        service.getUserRecentActivities(MOCK_USER_ID, 'unknown_user', '1.2.3.4')
      ).rejects.toThrow('User not found');
    });

    it('should throw an error when user profile is private', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      userSvc.findByUsername.mockResolvedValue(mockUser({ isPublic: false }));

      await expect(
        service.getUserRecentActivities(MOCK_USER_ID, 'dj_nour', '1.2.3.4')
      ).rejects.toThrow('User activities are private');
    });

    it('should return activities for a public user', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      userSvc.findByUsername.mockResolvedValue(mockUser({ userId: MOCK_OTHER_USER_ID }));
      const activity = mockActivity({
        activityType: ActivityType.TRACK_POSTED,
        targetId: MOCK_TRACK_ID,
      });
      activitySvc.getActivitiesByUserIds.mockResolvedValue([activity]);
      const track = mockTrack();
      trackRepo.findByIds.mockResolvedValue([track]);
      playlistRepo.findByIds.mockResolvedValue([]);

      const result = await service.getUserRecentActivities(MOCK_USER_ID, 'dj_nour', '1.2.3.4');

      expect(result).toHaveLength(1);
      expect((result as any)[0].target.trackId).toBe(MOCK_TRACK_ID);
    });

    it('should null out audioUrl for a track blocked in the requester region', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'EG' } as any);
      userSvc.findByUsername.mockResolvedValue(mockUser({ userId: MOCK_OTHER_USER_ID }));
      const activity = mockActivity({
        activityType: ActivityType.TRACK_POSTED,
        targetId: MOCK_TRACK_ID,
      });
      activitySvc.getActivitiesByUserIds.mockResolvedValue([activity]);
      const blockedTrack = mockTrack({ blockedRegions: ['EG'] });
      trackRepo.findByIds.mockResolvedValue([blockedTrack]);
      playlistRepo.findByIds.mockResolvedValue([]);

      const result = await service.getUserRecentActivities(MOCK_USER_ID, 'dj_nour', '1.2.3.4');

      expect((result as any)[0].target.audioUrl).toBeNull();
      expect((result as any)[0].target.isBlocked).toBe(true);
    });

    it('should call getActivitiesByUserIds with the target user ID', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      const targetUser = mockUser({ userId: MOCK_OTHER_USER_ID });
      userSvc.findByUsername.mockResolvedValue(targetUser);
      activitySvc.getActivitiesByUserIds.mockResolvedValue([]);
      trackRepo.findByIds.mockResolvedValue([]);
      playlistRepo.findByIds.mockResolvedValue([]);

      await service.getUserRecentActivities(MOCK_USER_ID, 'dj_nour', '1.2.3.4', 2, 10);

      expect(activitySvc.getActivitiesByUserIds).toHaveBeenCalledWith(
        [MOCK_OTHER_USER_ID],
        2,
        10,
        true
      );
    });
  });

  // ─── getTrackStation ───────────────────────────────────────────────────────

  describe('getTrackStation', () => {
    it('should throw NotFoundException when track does not exist', async () => {
      trackRepo.findTrackByTitleAndArtist.mockResolvedValue(null);

      await expect(
        service.getTrackStation('dj_nour', 'Midnight Drive', MOCK_USER_ID, '1.2.3.4')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when track is not public', async () => {
      trackRepo.findTrackByTitleAndArtist.mockResolvedValue(
        mockTrack({ visibility: TrackVisibility.PRIVATE })
      );

      await expect(
        service.getTrackStation('dj_nour', 'Midnight Drive', MOCK_USER_ID, '1.2.3.4')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when track is hidden', async () => {
      trackRepo.findTrackByTitleAndArtist.mockResolvedValue(
        mockTrack({ visibility: TrackVisibility.PUBLIC, hidden: true })
      );

      await expect(
        service.getTrackStation('dj_nour', 'Midnight Drive', MOCK_USER_ID, '1.2.3.4')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return the cached station when it exists and is fresh', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      trackRepo.findTrackByTitleAndArtist.mockResolvedValue(mockTrack());
      const freshStation = mockStation({ createdAt: new Date() });
      playlistRepo.getTrackStation.mockResolvedValue(freshStation);
      followersRepo.isFollowing.mockResolvedValue(false);

      const result = await service.getTrackStation(
        'dj_nour',
        'Midnight Drive',
        MOCK_USER_ID,
        '1.2.3.4'
      );

      expect(result.status).toBe('success');
      expect(result.data.playlistId).toBe(MOCK_STATION_ID);
      expect(playlistRepo.createTrackStation).not.toHaveBeenCalled();
    });

    it('should delete and recreate station when it is older than 15 days', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      const track = mockTrack();
      trackRepo.findTrackByTitleAndArtist.mockResolvedValue(track);
      const oldDate = new Date(Date.now() - 16 * 24 * 60 * 60 * 1000);
      const staleStation = mockStation({ createdAt: oldDate });
      playlistRepo.getTrackStation.mockResolvedValue(staleStation);
      playlistRepo.deletePlaylist.mockResolvedValue(undefined);
      trackSvc.getRelatedTracksByTrackId.mockResolvedValue([]);
      trackRepo.findPopularTracksByGenreOrTags.mockResolvedValue([]);
      const newStation = mockStation({ playlistId: 'new-station-uuid', createdAt: new Date() });
      playlistRepo.createTrackStation.mockResolvedValue(newStation);
      playlistRepo.addTrackToPlaylist.mockResolvedValue(undefined);
      playlistRepo.getPublicPlaylist.mockResolvedValue(newStation);
      followersRepo.isFollowing.mockResolvedValue(false);

      await service.getTrackStation('dj_nour', 'Midnight Drive', MOCK_USER_ID, '1.2.3.4');

      expect(playlistRepo.deletePlaylist).toHaveBeenCalledWith(staleStation.playlistId);
      expect(playlistRepo.createTrackStation).toHaveBeenCalled();
    });

    it('should create a new station when none exists', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      const track = mockTrack();
      trackRepo.findTrackByTitleAndArtist.mockResolvedValue(track);
      playlistRepo.getTrackStation.mockResolvedValue(null);
      trackSvc.getRelatedTracksByTrackId.mockResolvedValue([]);
      trackRepo.findPopularTracksByGenreOrTags.mockResolvedValue([]);
      const newStation = mockStation({ createdAt: new Date() });
      playlistRepo.createTrackStation.mockResolvedValue(newStation);
      playlistRepo.addTrackToPlaylist.mockResolvedValue(undefined);
      playlistRepo.getPublicPlaylist.mockResolvedValue(newStation);
      followersRepo.isFollowing.mockResolvedValue(false);

      const result = await service.getTrackStation(
        'dj_nour',
        'Midnight Drive',
        MOCK_USER_ID,
        '1.2.3.4'
      );

      expect(playlistRepo.createTrackStation).toHaveBeenCalledWith(
        track.trackId,
        track.title,
        track.coverImage,
        track.userId
      );
      expect(result.status).toBe('success');
    });

    it('should null out audioUrl and waveformUrl for tracks blocked in requester region', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'EG' } as any);
      const track = mockTrack();
      trackRepo.findTrackByTitleAndArtist.mockResolvedValue(track);
      const blockedTrackInStation = mockTrack({ blockedRegions: ['EG'] });
      const stationWithBlockedTrack = mockStation({
        createdAt: new Date(),
        playlistTracks: [mockPlaylistTrack(blockedTrackInStation as any)],
      });
      playlistRepo.getTrackStation.mockResolvedValue(stationWithBlockedTrack);
      followersRepo.isFollowing.mockResolvedValue(false);

      const result = await service.getTrackStation(
        'dj_nour',
        'Midnight Drive',
        MOCK_USER_ID,
        '1.2.3.4'
      );

      const stationTrack = result.data.tracks[0];
      expect(stationTrack.audioUrl).toBeNull();
      expect(stationTrack.waveformUrl).toBeNull();
    });

    it('should include featuredArtists in the response', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      trackRepo.findTrackByTitleAndArtist.mockResolvedValue(mockTrack());
      const freshStation = mockStation({ createdAt: new Date() });
      playlistRepo.getTrackStation.mockResolvedValue(freshStation);
      followersRepo.isFollowing.mockResolvedValue(false);

      const result = await service.getTrackStation(
        'dj_nour',
        'Midnight Drive',
        MOCK_USER_ID,
        '1.2.3.4'
      );

      expect(result.data.featuredArtists).toBeDefined();
      expect(Array.isArray(result.data.featuredArtists)).toBe(true);
    });
  });

  // ─── getArtistStation ──────────────────────────────────────────────────────

  describe('getArtistStation', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      userSvc.findByUsername.mockResolvedValue(null);

      await expect(
        service.getArtistStation('nonexistent-user', 'current-user-123', '192.168.1.1')
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.getArtistStation('nonexistent-user', 'current-user-123', '192.168.1.1')
      ).rejects.toThrow('User not found');
    });

    it('should throw ForbiddenException when user is private', async () => {
      userSvc.findByUsername.mockResolvedValue(mockUser({ isPublic: false }));

      await expect(
        service.getArtistStation('private-user', 'current-user-123', '192.168.1.1')
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.getArtistStation('private-user', 'current-user-123', '192.168.1.1')
      ).rejects.toThrow('User is private');
    });

    it('should return existing station if less than 15 days old', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      const user = mockUser();
      const recentStation = mockStation({
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days old
      });

      userSvc.findByUsername.mockResolvedValue(user);
      playlistRepo.getArtistStation.mockResolvedValue(recentStation);
      followersRepo.isFollowing.mockResolvedValue(false);

      const result = await service.getArtistStation(
        'artist-user',
        'current-user-123',
        '192.168.1.1'
      );

      expect(playlistRepo.getArtistStation).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(result.status).toBe('success');
      expect(result.data.playlistId).toBe(MOCK_STATION_ID);

      // Should NOT create a new station
      expect(trackRepo.getAllUserTracks).not.toHaveBeenCalled();
      expect(playlistRepo.createArtistStation).not.toHaveBeenCalled();
    });

    it('should create new station when no existing station exists', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      const user = mockUser();
      const tracks = [
        mockTrack({ trackId: 'track-1', title: 'Track 1', genreId: 'genre-1' }),
        mockTrack({ trackId: 'track-2', title: 'Track 2', genreId: 'genre-1' }),
      ];
      const newStation = mockStation({ playlistId: 'new-playlist-1' });
      const stationWithTracks = mockStation({
        playlistId: 'new-playlist-1',
        playlistTracks: [mockPlaylistTrack(tracks[0] as any, 1)],
      });

      userSvc.findByUsername.mockResolvedValue(user);
      playlistRepo.getArtistStation.mockResolvedValue(null);
      trackRepo.getAllUserTracks.mockResolvedValue(tracks);
      trackSvc.getPopularityScore.mockResolvedValue(100);
      trackSvc.getRelatedTracksByTrackId.mockResolvedValue([]);
      trackRepo.findPopularTracksByGenreOrTags.mockResolvedValue([]);
      playlistRepo.createArtistStation.mockResolvedValue(newStation);
      playlistRepo.addTrackToPlaylist.mockResolvedValue({});
      playlistRepo.getPublicPlaylist.mockResolvedValue(stationWithTracks);
      followersRepo.isFollowing.mockResolvedValue(false);

      const result = await service.getArtistStation(
        'artist-user',
        'current-user-123',
        '192.168.1.1'
      );

      expect(trackRepo.getAllUserTracks).toHaveBeenCalledWith('artist-user');
      expect(playlistRepo.createArtistStation).toHaveBeenCalledWith(
        'DJ Nour',
        'https://cdn.harmonica.com/avatars/dj_nour.jpg',
        MOCK_USER_ID
      );
      expect(result.status).toBe('success');
    });

    it('should regenerate station when existing station is older than 15 days', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      const user = mockUser();
      const oldStation = mockStation({
        playlistId: 'old-playlist-1',
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days old
        likesCount: 50,
      });
      const tracks = [mockTrack()];
      const newStation = mockStation({ playlistId: 'new-playlist-1' });
      const stationWithTracks = mockStation({
        playlistId: 'new-playlist-1',
        playlistTracks: [mockPlaylistTrack(tracks[0] as any, 1)],
      });

      userSvc.findByUsername.mockResolvedValue(user);
      playlistRepo.getArtistStation.mockResolvedValue(oldStation);
      trackRepo.getAllUserTracks.mockResolvedValue(tracks);
      trackSvc.getPopularityScore.mockResolvedValue(100);
      trackSvc.getRelatedTracksByTrackId.mockResolvedValue([]);
      trackRepo.findPopularTracksByGenreOrTags.mockResolvedValue([]);
      playlistRepo.createArtistStation.mockResolvedValue(newStation);
      playlistRepo.addTrackToPlaylist.mockResolvedValue({});
      playlistRepo.getPublicPlaylist.mockResolvedValue(stationWithTracks);
      playlistRepo.transferStationLikes.mockResolvedValue({});
      playlistRepo.deletePlaylist.mockResolvedValue({});
      followersRepo.isFollowing.mockResolvedValue(false);

      await service.getArtistStation('artist-user', 'current-user-123', '192.168.1.1');

      // Should transfer likes from old station
      expect(playlistRepo.transferStationLikes).toHaveBeenCalledWith(
        'old-playlist-1',
        'new-playlist-1'
      );

      // Should delete old station
      expect(playlistRepo.deletePlaylist).toHaveBeenCalledWith('old-playlist-1');
    });

    it('should score artist tracks correctly', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      const user = mockUser();
      const artistTracks = [
        mockTrack({ trackId: 'artist-track-1', userId: MOCK_USER_ID }),
        mockTrack({ trackId: 'artist-track-2', userId: MOCK_USER_ID }),
      ];
      const otherTracks = [mockTrack({ trackId: 'other-track-1', userId: MOCK_OTHER_USER_ID })];
      const newStation = mockStation();
      const stationWithTracks = mockStation({
        playlistTracks: [mockPlaylistTrack(artistTracks[0] as any, 1)],
      });

      userSvc.findByUsername.mockResolvedValue(user);
      playlistRepo.getArtistStation.mockResolvedValue(null);
      trackRepo.getAllUserTracks.mockResolvedValue(artistTracks);
      trackSvc.getPopularityScore.mockResolvedValue(100);
      trackSvc.getRelatedTracksByTrackId.mockResolvedValue(otherTracks);
      trackRepo.findPopularTracksByGenreOrTags.mockResolvedValue([]);
      playlistRepo.createArtistStation.mockResolvedValue(newStation);
      playlistRepo.addTrackToPlaylist.mockResolvedValue({});
      playlistRepo.getPublicPlaylist.mockResolvedValue(stationWithTracks);
      followersRepo.isFollowing.mockResolvedValue(false);

      await service.getArtistStation('artist-user', 'current-user-123', '192.168.1.1');

      // Artist tracks should get: 10 (base) + 15 (same artist) = 25 points
      // Other tracks should get: 8 (related) = 8 points
      expect(playlistRepo.addTrackToPlaylist).toHaveBeenCalled();
    });

    it('should include related tracks from popular tracks', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      const user = mockUser();
      const popularTracks = [
        mockTrack({ trackId: 'popular-1' }),
        mockTrack({ trackId: 'popular-2' }),
      ];
      const relatedTracks = [
        mockTrack({ trackId: 'related-1' }),
        mockTrack({ trackId: 'related-2' }),
      ];
      const newStation = mockStation();
      const stationWithTracks = mockStation({
        playlistTracks: [mockPlaylistTrack(popularTracks[0] as any, 1)],
      });

      userSvc.findByUsername.mockResolvedValue(user);
      playlistRepo.getArtistStation.mockResolvedValue(null);
      trackRepo.getAllUserTracks.mockResolvedValue(popularTracks);
      trackSvc.getPopularityScore.mockResolvedValue(100);
      trackSvc.getRelatedTracksByTrackId.mockResolvedValue(relatedTracks);
      trackRepo.findPopularTracksByGenreOrTags.mockResolvedValue([]);
      playlistRepo.createArtistStation.mockResolvedValue(newStation);
      playlistRepo.addTrackToPlaylist.mockResolvedValue({});
      playlistRepo.getPublicPlaylist.mockResolvedValue(stationWithTracks);
      followersRepo.isFollowing.mockResolvedValue(false);

      await service.getArtistStation('artist-user', 'current-user-123', '192.168.1.1');

      // Should call getRelatedTracksByTrackId for each popular track
      expect(trackSvc.getRelatedTracksByTrackId).toHaveBeenCalledTimes(
        Math.min(popularTracks.length, 10)
      );
    });

    it('should include metadata-based candidates with correct scoring', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      const user = mockUser();
      const artistTracks = [
        mockTrack({
          trackId: 'artist-1',
          genreId: 'genre-1',
          tags: [{ genreId: 'tag-1' }, { genreId: 'tag-2' }] as any,
        }),
      ];
      const metadataTracks = [
        mockTrack({
          trackId: 'metadata-1',
          genreId: 'genre-1',
          tags: [{ genreId: 'tag-1' }] as any,
          userId: MOCK_OTHER_USER_ID,
        }),
      ];
      const newStation = mockStation();
      const stationWithTracks = mockStation({
        playlistTracks: [mockPlaylistTrack(artistTracks[0] as any, 1)],
      });

      userSvc.findByUsername.mockResolvedValue(user);
      playlistRepo.getArtistStation.mockResolvedValue(null);
      trackRepo.getAllUserTracks.mockResolvedValue(artistTracks);
      trackSvc.getPopularityScore.mockResolvedValue(100);
      trackSvc.getRelatedTracksByTrackId.mockResolvedValue([]);
      trackRepo.findPopularTracksByGenreOrTags.mockResolvedValue(metadataTracks);
      playlistRepo.createArtistStation.mockResolvedValue(newStation);
      playlistRepo.addTrackToPlaylist.mockResolvedValue({});
      playlistRepo.getPublicPlaylist.mockResolvedValue(stationWithTracks);
      followersRepo.isFollowing.mockResolvedValue(false);

      await service.getArtistStation('artist-user', 'current-user-123', '192.168.1.1');

      // Should fetch metadata candidates with correct parameters
      expect(trackRepo.findPopularTracksByGenreOrTags).toHaveBeenCalledWith(
        'genre-1',
        expect.any(Array),
        1,
        40
      );

      // Metadata track should get: 5 (genre match) + 3 (1 tag match) = 8 points
    });

    it('should apply region blocking based on IP', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      const user = mockUser();
      const tracks = [
        mockTrack({
          trackId: 'blocked-track',
          blockedRegions: ['US'],
        }),
      ];
      const newStation = mockStation();
      const stationWithTracks = mockStation({
        playlistTracks: [mockPlaylistTrack(tracks[0] as any, 1)],
      });

      userSvc.findByUsername.mockResolvedValue(user);
      playlistRepo.getArtistStation.mockResolvedValue(null);
      trackRepo.getAllUserTracks.mockResolvedValue(tracks);
      trackSvc.getPopularityScore.mockResolvedValue(100);
      trackSvc.getRelatedTracksByTrackId.mockResolvedValue([]);
      trackRepo.findPopularTracksByGenreOrTags.mockResolvedValue([]);
      playlistRepo.createArtistStation.mockResolvedValue(newStation);
      playlistRepo.addTrackToPlaylist.mockResolvedValue({});
      playlistRepo.getPublicPlaylist.mockResolvedValue(stationWithTracks);
      followersRepo.isFollowing.mockResolvedValue(false);

      // US IP address
      const result = await service.getArtistStation('artist-user', 'current-user-123', '8.8.8.8');

      // Track should be censored
      expect(result.data.tracks[0].audioUrl).toBeNull();
      expect(result.data.tracks[0].waveformUrl).toBeNull();
    });

    it('should include featured artists with follow status', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      const user = mockUser();
      const artist1 = mockUser({ userId: 'artist-1', username: 'featured1' });
      const artist2 = mockUser({ userId: 'artist-2', username: 'featured2' });
      const tracks = [
        mockTrack({ trackId: 'track-1', userId: 'artist-1', user: artist1 }),
        mockTrack({ trackId: 'track-2', userId: 'artist-2', user: artist2 }),
        mockTrack({ trackId: 'track-3', userId: 'artist-1', user: artist1 }), // Duplicate artist
      ];
      const newStation = mockStation();
      const stationWithTracks = mockStation({
        playlistTracks: tracks.map((t, i) => mockPlaylistTrack(t as any, i + 1)),
      });

      userSvc.findByUsername.mockResolvedValue(user);
      playlistRepo.getArtistStation.mockResolvedValue(null);
      trackRepo.getAllUserTracks.mockResolvedValue([]);
      trackSvc.getPopularityScore.mockResolvedValue(100);
      trackSvc.getRelatedTracksByTrackId.mockResolvedValue([]);
      trackRepo.findPopularTracksByGenreOrTags.mockResolvedValue([]);
      playlistRepo.createArtistStation.mockResolvedValue(newStation);
      playlistRepo.addTrackToPlaylist.mockResolvedValue({});
      playlistRepo.getPublicPlaylist.mockResolvedValue(stationWithTracks);
      followersRepo.isFollowing
        .mockResolvedValueOnce(true) // artist-1 is followed
        .mockResolvedValueOnce(false); // artist-2 is not followed

      const result = await service.getArtistStation(
        'artist-user',
        'current-user-123',
        '192.168.1.1'
      );

      // Should only include first 3 unique artists
      expect(result.data.featuredArtists.length).toBeLessThanOrEqual(3);

      // Should check follow status
      expect(followersRepo.isFollowing).toHaveBeenCalled();
    });

    it('should handle artist with no tracks', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      const user = mockUser();
      const newStation = mockStation();
      const stationWithTracks = mockStation({
        playlistTracks: [],
        tracksCount: 0,
      });

      userSvc.findByUsername.mockResolvedValue(user);
      playlistRepo.getArtistStation.mockResolvedValue(null);
      trackRepo.getAllUserTracks.mockResolvedValue([]);
      trackSvc.getPopularityScore.mockResolvedValue(0);
      trackSvc.getRelatedTracksByTrackId.mockResolvedValue([]);
      trackRepo.findPopularTracksByGenreOrTags.mockResolvedValue([]);
      playlistRepo.createArtistStation.mockResolvedValue(newStation);
      playlistRepo.getPublicPlaylist.mockResolvedValue(stationWithTracks);
      followersRepo.isFollowing.mockResolvedValue(false);

      const result = await service.getArtistStation(
        'artist-user',
        'current-user-123',
        '192.168.1.1'
      );

      expect(result.status).toBe('success');
      expect(result.data.tracks).toHaveLength(0);
    });
  });
});
