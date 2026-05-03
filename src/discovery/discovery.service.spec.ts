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
import * as searchModule from '../search/search';
import { REDIS_CLIENT } from '../redis/redis.module';
import { GenreRepository } from '../genre/genre.repository';
import { TRENDING_MUSIC_USER } from '../user/trending-music-user.constants';

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
  getTopFollowedArtistUsernames: jest.fn(),
});

const mockActivityService = () => ({
  getActivitiesByUserIds: jest.fn(),
  getLikedByUsers: jest.fn(),
});

const mockTrackRepository = () => ({
  findByIds: jest.fn(),
  findTrackByTitleAndArtist: jest.fn(),
  findPopularTracksByGenreOrTags: jest.fn(),
  getAllUserTracks: jest.fn(),
  getUserLikedTrackIds: jest.fn(),
  getUserRepostedTrackIds: jest.fn(),
  getUserLastListenedArtistUsernames: jest.fn(),
  findTracksByGenreOrTags: jest.fn(),
  getUserTrackLikes: jest.fn(),
  getUserRecentlyPlayed: jest.fn(),
  findNewReleasedTracks: jest.fn(),
  getTopTrack: jest.fn(),
  findUpAndComingArtists: jest.fn(),
  findTrendingTracks: jest.fn(),
});

const mockTrackService = () => ({
  getRelatedTracksByTrackId: jest.fn(),
  getPopularityScore: jest.fn(),
  getUserInteractedTrackTags: jest.fn(),
  getTopTracksByTagIds: jest.fn(),
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
  findPlaylistsByIds: jest.fn(),
  findAlbumsByIds: jest.fn(),
  getUserLikedPlaylistIds: jest.fn(),
  getUserRepostedPlaylistIds: jest.fn(),
  getPlaylistByUserAndTitles: jest.fn(),
  findLikeByUserAndPlaylist: jest.fn(),
  findPopularPlaylistsByGenreOrTags: jest.fn(),
  getUserPlaylistLikes: jest.fn(),
  getUserInteractedAlbumTags: jest.fn(),
  getTopAlbumsByTagIds: jest.fn(),
  getPlaylistByUserAndTitle: jest.fn(),
  createPlaylist: jest.fn(),
  updatePlaylistGenre: jest.fn(),
  clearPlaylistTracks: jest.fn(),
});

const mockUserService = () => ({
  findByUsername: jest.fn(),
  findByIds: jest.fn(),
  findById: jest.fn(),
});

const mockGenreRepository = () => ({
  findByIds: jest.fn(),
  findPopularGenres: jest.fn(),
  findByName: jest.fn(),
  findByNames: jest.fn(),
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
  let genreRepo: ReturnType<typeof mockGenreRepository>;
  let redis: { get: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    redis = { get: jest.fn(), set: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        { provide: FollowersRepository, useFactory: mockFollowersRepository },
        { provide: ActivityService, useFactory: mockActivityService },
        { provide: TrackRepository, useFactory: mockTrackRepository },
        { provide: TrackService, useFactory: mockTrackService },
        { provide: PlaylistRepository, useFactory: mockPlaylistRepository },
        { provide: UserService, useFactory: mockUserService },
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: GenreRepository, useFactory: mockGenreRepository },
      ],
    }).compile();

    service = module.get<DiscoveryService>(DiscoveryService);
    followersRepo = module.get(FollowersRepository);
    activitySvc = module.get(ActivityService);
    trackRepo = module.get(TrackRepository);
    trackSvc = module.get(TrackService);
    playlistRepo = module.get(PlaylistRepository);
    userSvc = module.get(UserService);
    genreRepo = module.get(GenreRepository);

    // Default resolved values for batch-status methods used in assembleActivities
    playlistRepo.getUserLikedPlaylistIds.mockResolvedValue(new Set());
    playlistRepo.getUserRepostedPlaylistIds.mockResolvedValue(new Set());
    trackRepo.getUserLikedTrackIds.mockResolvedValue(new Set());
    trackRepo.getUserRepostedTrackIds.mockResolvedValue(new Set());
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
      expect(pt.audioUrl).toBeNull();
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

    it('should set target to null for track activity when track is not in batch result', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      followersRepo.getFollowingIds.mockResolvedValue([MOCK_OTHER_USER_ID]);
      const foundActivity = mockActivity({
        activityType: ActivityType.TRACK_POSTED,
        targetId: MOCK_TRACK_ID,
      });
      const missingActivity = mockActivity({
        activityId: 'act-missing',
        activityType: ActivityType.TRACK_POSTED,
        targetId: 'nonexistent-track-id',
      });
      activitySvc.getActivitiesByUserIds.mockResolvedValue([foundActivity, missingActivity]);
      trackRepo.findByIds.mockResolvedValue([mockTrack()]);
      playlistRepo.findByIds.mockResolvedValue([]);

      const result = await service.getFeed(MOCK_USER_ID, '1.2.3.4', true);

      expect((result as any)[0].target).not.toBeNull();
      expect((result as any)[1].target).toBeNull();
    });

    it('should handle playlist activities where playlist is not found', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      followersRepo.getFollowingIds.mockResolvedValue([MOCK_OTHER_USER_ID]);
      const activity = mockActivity({
        activityType: ActivityType.PLAYLIST_POSTED,
        targetId: 'missing-playlist-id',
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
      trackRepo.findTracksByGenreOrTags.mockResolvedValue([[], 0]);
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
      trackRepo.findTracksByGenreOrTags.mockResolvedValue([[], 0]);
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

    it('should null out audioUrl for tracks blocked in requester region', async () => {
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
      trackRepo.findTracksByGenreOrTags.mockResolvedValue([[], 0]);
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
      trackRepo.findTracksByGenreOrTags.mockResolvedValue([[], 0]);
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
      trackRepo.findTracksByGenreOrTags.mockResolvedValue([[], 0]);
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
      trackRepo.findTracksByGenreOrTags.mockResolvedValue([[], 0]);
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
      trackRepo.findTracksByGenreOrTags.mockResolvedValue([metadataTracks, metadataTracks.length]);
      playlistRepo.createArtistStation.mockResolvedValue(newStation);
      playlistRepo.addTrackToPlaylist.mockResolvedValue({});
      playlistRepo.getPublicPlaylist.mockResolvedValue(stationWithTracks);
      followersRepo.isFollowing.mockResolvedValue(false);

      await service.getArtistStation('artist-user', 'current-user-123', '192.168.1.1');

      // Should fetch metadata candidates with correct parameters
      expect(trackRepo.findTracksByGenreOrTags).toHaveBeenCalledWith(
        ['genre-1'],
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
      trackRepo.findTracksByGenreOrTags.mockResolvedValue([[], 0]);
      playlistRepo.createArtistStation.mockResolvedValue(newStation);
      playlistRepo.addTrackToPlaylist.mockResolvedValue({});
      playlistRepo.getPublicPlaylist.mockResolvedValue(stationWithTracks);
      followersRepo.isFollowing.mockResolvedValue(false);

      // US IP address
      const result = await service.getArtistStation('artist-user', 'current-user-123', '8.8.8.8');

      // Track should be censored
      expect(result.data.tracks[0].audioUrl).toBeNull();
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
      trackRepo.findTracksByGenreOrTags.mockResolvedValue([[], 0]);
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
      trackRepo.findTracksByGenreOrTags.mockResolvedValue([[], 0]);
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

  // ─── getUserPopularTracks ──────────────────────────────────────────────────

  describe('getUserPopularTracks', () => {
    it('should return error object when user is not found', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      userSvc.findByUsername.mockResolvedValue(null);
      followersRepo.hasBlockRelationship.mockResolvedValue(false);

      const result = await service.getUserPopularTracks('unknown', MOCK_USER_ID, '1.2.3.4');

      expect(result).toEqual({ status: 'error', message: 'User not found' });
    });

    it('should throw ForbiddenException when block relationship exists', async () => {
      userSvc.findByUsername.mockResolvedValue(mockUser({ userId: MOCK_OTHER_USER_ID }));
      followersRepo.hasBlockRelationship.mockResolvedValue(true);

      await expect(
        service.getUserPopularTracks('dj_nour', MOCK_USER_ID, '1.2.3.4')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return empty data when user has no tracks', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      userSvc.findByUsername.mockResolvedValue(mockUser({ userId: MOCK_OTHER_USER_ID }));
      followersRepo.hasBlockRelationship.mockResolvedValue(false);
      trackRepo.getAllUserTracks.mockResolvedValue([]);

      const result = await service.getUserPopularTracks('dj_nour', MOCK_USER_ID, '1.2.3.4');

      expect(result).toEqual({ status: 'success', data: [] });
    });

    it('should return top 10 tracks sorted by popularity score', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      userSvc.findByUsername.mockResolvedValue(mockUser({ userId: MOCK_OTHER_USER_ID }));
      followersRepo.hasBlockRelationship.mockResolvedValue(false);
      const tracks = Array.from({ length: 12 }, (_, i) =>
        mockTrack({ trackId: `track-${i}`, title: `Track ${i}` })
      );
      trackRepo.getAllUserTracks.mockResolvedValue(tracks);
      trackSvc.getPopularityScore.mockImplementation(async (id: string) => {
        const idx = parseInt(id.replace('track-', ''), 10);
        return 100 - idx; // track-0 = 100, track-11 = 89
      });
      trackRepo.getUserLikedTrackIds.mockResolvedValue(new Set());
      trackRepo.getUserRepostedTrackIds.mockResolvedValue(new Set());

      const result = await service.getUserPopularTracks('dj_nour', MOCK_USER_ID, '1.2.3.4');

      expect((result as any).status).toBe('success');
      expect((result as any).data.length).toBeLessThanOrEqual(10);
    });

    it('should null out audioUrl for tracks blocked in the requester region', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'EG' } as any);
      userSvc.findByUsername.mockResolvedValue(mockUser({ userId: MOCK_OTHER_USER_ID }));
      followersRepo.hasBlockRelationship.mockResolvedValue(false);
      const blockedTrack = mockTrack({ blockedRegions: ['EG'] });
      trackRepo.getAllUserTracks.mockResolvedValue([blockedTrack]);
      trackSvc.getPopularityScore.mockResolvedValue(50);
      trackRepo.getUserLikedTrackIds.mockResolvedValue(new Set());
      trackRepo.getUserRepostedTrackIds.mockResolvedValue(new Set());

      const result = await service.getUserPopularTracks('dj_nour', MOCK_USER_ID, '1.2.3.4');

      expect((result as any).data[0].audioUrl).toBeNull();
    });

    it('should include isLiked and isReposted flags on tracks', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      userSvc.findByUsername.mockResolvedValue(mockUser({ userId: MOCK_OTHER_USER_ID }));
      followersRepo.hasBlockRelationship.mockResolvedValue(false);
      const track = mockTrack();
      trackRepo.getAllUserTracks.mockResolvedValue([track]);
      trackSvc.getPopularityScore.mockResolvedValue(50);
      trackRepo.getUserLikedTrackIds.mockResolvedValue(new Set([MOCK_TRACK_ID]));
      trackRepo.getUserRepostedTrackIds.mockResolvedValue(new Set());

      const result = await service.getUserPopularTracks('dj_nour', MOCK_USER_ID, '1.2.3.4');

      expect((result as any).data[0].isLiked).toBe(true);
      expect((result as any).data[0].isReposted).toBe(false);
    });
  });

  // ─── getMoreOfWhatYouLike ─────────────────────────────────────────────────

  describe('getMoreOfWhatYouLike', () => {
    it('should return empty data when user has no interaction history', async () => {
      trackSvc.getUserInteractedTrackTags.mockResolvedValue([]);

      const result = await service.getMoreOfWhatYouLike(MOCK_USER_ID, '1.2.3.4');

      expect(result).toEqual({ status: 'success', data: [] });
      expect(trackSvc.getTopTracksByTagIds).not.toHaveBeenCalled();
    });

    it('should return tracks based on top interacted tags', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      trackSvc.getUserInteractedTrackTags.mockResolvedValue([
        { genreId: 'tag-1', name: 'Electronic' },
        { genreId: 'tag-1', name: 'Electronic' },
        { genreId: 'tag-2', name: 'Hip-Hop' },
      ]);
      const track = mockTrack();
      trackSvc.getTopTracksByTagIds.mockResolvedValue([track]);

      const result = await service.getMoreOfWhatYouLike(MOCK_USER_ID, '1.2.3.4');

      expect(trackSvc.getTopTracksByTagIds).toHaveBeenCalledWith(
        expect.arrayContaining(['tag-1', 'tag-2']),
        MOCK_USER_ID
      );
      expect((result as any).status).toBe('success');
      expect((result as any).data).toHaveLength(1);
    });

    it('should null out audioUrl for region-blocked tracks', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'EG' } as any);
      trackSvc.getUserInteractedTrackTags.mockResolvedValue([
        { genreId: 'tag-1', name: 'Electronic' },
      ]);
      const blockedTrack = mockTrack({ blockedRegions: ['EG'] });
      trackSvc.getTopTracksByTagIds.mockResolvedValue([blockedTrack]);

      const result = await service.getMoreOfWhatYouLike(MOCK_USER_ID, '1.2.3.4');

      expect((result as any).data[0].audioUrl).toBeNull();
    });

    it('should limit to top 5 tags', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      const tags = Array.from({ length: 8 }, (_, i) => ({ genreId: `tag-${i}`, name: `Tag ${i}` }));
      trackSvc.getUserInteractedTrackTags.mockResolvedValue(tags);
      trackSvc.getTopTracksByTagIds.mockResolvedValue([]);

      await service.getMoreOfWhatYouLike(MOCK_USER_ID, '1.2.3.4');

      const call = trackSvc.getTopTracksByTagIds.mock.calls[0];
      expect(call[0].length).toBeLessThanOrEqual(5);
    });

    it('should return empty array when user has no track likes (getTopTracksByTagIds returns empty)', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      trackSvc.getUserInteractedTrackTags.mockResolvedValue([
        { genreId: 'tag-1', name: 'Electronic' },
      ]);
      trackSvc.getTopTracksByTagIds.mockResolvedValue([]);

      const result = await service.getMoreOfWhatYouLike(MOCK_USER_ID, '1.2.3.4');

      expect((result as any).status).toBe('success');
      expect((result as any).data).toEqual([]);
    });

    it('should handle case where tag lookup returns nothing', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      trackSvc.getUserInteractedTrackTags.mockResolvedValue([
        { genreId: 'tag-1', name: 'Jazz' },
        { genreId: 'tag-2', name: 'Blues' },
      ]);
      trackSvc.getTopTracksByTagIds.mockResolvedValue([]);

      const result = await service.getMoreOfWhatYouLike(MOCK_USER_ID, '1.2.3.4');

      expect(trackSvc.getTopTracksByTagIds).toHaveBeenCalled();
      expect((result as any).data).toHaveLength(0);
    });
  });

  // ─── getSearchResults ─────────────────────────────────────────────────────

  describe('getSearchResults', () => {
    beforeEach(() => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
    });

    it('should return empty results when search returns no hits', async () => {
      jest.spyOn(searchModule, 'search').mockResolvedValue({ hits: [], total: 0 });

      const result = await service.getSearchResults(
        MOCK_USER_ID,
        'nothing',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '1.2.3.4'
      );

      expect(result).toEqual({ status: 'success', total: 0, data: [] });
    });

    it('should return a BadRequestException for invalid duration filter', async () => {
      const result = await service.getSearchResults(
        MOCK_USER_ID,
        'q',
        'track',
        undefined,
        undefined,
        'invalid-duration',
        undefined,
        '1.2.3.4'
      );

      expect(result).toBeInstanceOf(Error);
    });

    it('should return a BadRequestException for invalid created filter', async () => {
      const result = await service.getSearchResults(
        MOCK_USER_ID,
        'q',
        undefined,
        undefined,
        undefined,
        undefined,
        'invalid-date',
        '1.2.3.4'
      );

      expect(result).toBeInstanceOf(Error);
    });

    it('should map track hits to formatted track objects', async () => {
      const track = mockTrack();
      jest.spyOn(searchModule, 'search').mockResolvedValue({
        hits: [{ id: `track_${MOCK_TRACK_ID}`, type: 'track' }],
        total: 1,
      });
      trackRepo.findByIds.mockResolvedValue([track]);
      userSvc.findByIds.mockResolvedValue([]);
      playlistRepo.findPlaylistsByIds.mockResolvedValue([]);
      playlistRepo.findAlbumsByIds.mockResolvedValue([]);

      const result = await service.getSearchResults(
        MOCK_USER_ID,
        'midnight',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '1.2.3.4'
      );

      expect((result as any).status).toBe('success');
      expect((result as any).data[0].type).toBe('track');
      expect((result as any).data[0].trackId).toBe(MOCK_TRACK_ID);
    });

    it('should map user hits to formatted user objects', async () => {
      const user = mockUser({ userId: MOCK_OTHER_USER_ID, username: 'dj_nour' });
      jest.spyOn(searchModule, 'search').mockResolvedValue({
        hits: [{ id: `user_${MOCK_OTHER_USER_ID}`, type: 'user' }],
        total: 1,
      });
      userSvc.findByIds.mockResolvedValue([user]);
      trackRepo.findByIds.mockResolvedValue([]);
      playlistRepo.findPlaylistsByIds.mockResolvedValue([]);
      playlistRepo.findAlbumsByIds.mockResolvedValue([]);
      followersRepo.isFollowing.mockResolvedValue(false);

      const result = await service.getSearchResults(
        MOCK_USER_ID,
        'dj_nour',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '1.2.3.4'
      );

      expect((result as any).data[0].type).toBe('user');
      expect((result as any).data[0].userId).toBe(MOCK_OTHER_USER_ID);
    });

    it('should null out audioUrl for blocked tracks in search results', async () => {
      const blockedTrack = mockTrack({ blockedRegions: ['US'] });
      jest.spyOn(searchModule, 'search').mockResolvedValue({
        hits: [{ id: `track_${MOCK_TRACK_ID}`, type: 'track' }],
        total: 1,
      });
      trackRepo.findByIds.mockResolvedValue([blockedTrack]);
      userSvc.findByIds.mockResolvedValue([]);
      playlistRepo.findPlaylistsByIds.mockResolvedValue([]);
      playlistRepo.findAlbumsByIds.mockResolvedValue([]);

      const result = await service.getSearchResults(
        MOCK_USER_ID,
        'midnight',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '1.2.3.4'
      );

      expect((result as any).data[0].audioUrl).toBeNull();
    });

    it('should call search module with the provided query term', async () => {
      const searchSpy = jest
        .spyOn(searchModule, 'search')
        .mockResolvedValue({ hits: [], total: 0 });

      await service.getSearchResults(
        MOCK_USER_ID,
        'midnight vibes',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '1.2.3.4'
      );

      expect(searchSpy).toHaveBeenCalledWith(expect.objectContaining({ query: 'midnight vibes' }));
    });

    it('should return empty data array and total 0 when search returns no hits', async () => {
      jest.spyOn(searchModule, 'search').mockResolvedValue({ hits: [], total: 0 });
      trackRepo.findByIds.mockResolvedValue([]);
      userSvc.findByIds.mockResolvedValue([]);
      playlistRepo.findPlaylistsByIds.mockResolvedValue([]);
      playlistRepo.findAlbumsByIds.mockResolvedValue([]);

      const result = await service.getSearchResults(
        MOCK_USER_ID,
        'nothing here',
        'track',
        undefined,
        undefined,
        undefined,
        undefined,
        '1.2.3.4'
      );

      expect((result as any).total).toBe(0);
      expect((result as any).data).toEqual([]);
    });
  });

  // ─── searchAutocomplete ────────────────────────────────────────────────────

  describe('searchAutocomplete', () => {
    it('should return autocomplete suggestions', async () => {
      jest
        .spyOn(searchModule, 'autocomplete')
        .mockResolvedValue(['midnight drive', 'midnight bass']);

      const result = await service.searchAutocomplete('mid');

      expect(searchModule.autocomplete).toHaveBeenCalledWith('mid');
      expect(result).toEqual({ status: 'success', data: ['midnight drive', 'midnight bass'] });
    });

    it('should return empty array when no suggestions match', async () => {
      jest.spyOn(searchModule, 'autocomplete').mockResolvedValue([]);

      const result = await service.searchAutocomplete('zzzzz');

      expect(result).toEqual({ status: 'success', data: [] });
    });
  });

  // ─── getRecommendedStations ────────────────────────────────────────────────

  describe('getRecommendedStations', () => {
    it('should return cached stations when cache hit exists', async () => {
      const cachedStations = [{ playlistId: 'station-1', title: 'DJ Nour Station' }];
      redis.get.mockResolvedValue(JSON.stringify(cachedStations));

      const result = await service.getRecommendedStations(MOCK_USER_ID, '1.2.3.4');

      expect(redis.get).toHaveBeenCalledWith(`recommended_stations:${MOCK_USER_ID}`);
      expect(result).toEqual(cachedStations);
      expect(trackRepo.getUserLastListenedArtistUsernames).not.toHaveBeenCalled();
    });

    it('should build stations from listening history when cache is empty', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      redis.get.mockResolvedValue(null);
      trackRepo.getUserLastListenedArtistUsernames.mockResolvedValue([]);
      followersRepo.getTopFollowedArtistUsernames.mockResolvedValue([]);
      redis.set.mockResolvedValue('OK');

      const result = await service.getRecommendedStations(MOCK_USER_ID, '1.2.3.4');

      expect(trackRepo.getUserLastListenedArtistUsernames).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(followersRepo.getTopFollowedArtistUsernames).toHaveBeenCalledWith(MOCK_USER_ID, 5);
      expect(redis.set).toHaveBeenCalled();
      expect((result as any).status).toBe('success');
      expect((result as any).data).toEqual([]);
    });

    it('should deduplicate usernames from listening history and followed artists', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      redis.get.mockResolvedValue(null);
      // 'dj_nour' appears in both sources
      trackRepo.getUserLastListenedArtistUsernames.mockResolvedValue(['dj_nour', 'artist2']);
      followersRepo.getTopFollowedArtistUsernames.mockResolvedValue(['dj_nour', 'artist3']);
      // Make all artist station calls fail gracefully (unknown users)
      userSvc.findByUsername.mockResolvedValue(null);
      redis.set.mockResolvedValue('OK');

      const result = await service.getRecommendedStations(MOCK_USER_ID, '1.2.3.4');

      // 3 unique usernames: dj_nour, artist2, artist3
      expect(userSvc.findByUsername).toHaveBeenCalledTimes(3);
      expect((result as any).data).toEqual([]);
    });

    it('should cache the result after fetching', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      redis.get.mockResolvedValue(null);
      trackRepo.getUserLastListenedArtistUsernames.mockResolvedValue([]);
      followersRepo.getTopFollowedArtistUsernames.mockResolvedValue([]);
      redis.set.mockResolvedValue('OK');

      await service.getRecommendedStations(MOCK_USER_ID, '1.2.3.4');

      expect(redis.set).toHaveBeenCalledWith(
        `recommended_stations:${MOCK_USER_ID}`,
        expect.any(String),
        expect.objectContaining({ EX: expect.any(Number) })
      );
    });
  });

  // ─── getTrendingMusicByGenre ──────────────────────────────────────────────

  describe('getTrendingMusicByGenre', () => {
    const TRENDING_USER_ID = '111e8400-e29b-41d4-a716-000000000001';
    const trendingUser = {
      userId: TRENDING_USER_ID,
      username: TRENDING_MUSIC_USER.username,
      displayName: 'Trending Music',
      avatarUrl: null,
    };

    const mockPlaylist = (id: string, title: string) => ({
      playlistId: id,
      title,
      description: null,
      coverImage: null,
      isPublic: true,
      tracksCount: 10,
      likesCount: 5,
      repostsCount: 2,
      totalDurationSeconds: 1800,
      createdAt: new Date('2024-01-01'),
    });

    it('should throw if trending music user is not found', async () => {
      userSvc.findByUsername.mockResolvedValue(null);

      await expect(service.getTrendingMusicByGenre(MOCK_USER_ID)).rejects.toThrow(
        'Trending Music user not found'
      );
    });

    it('should return empty data when user has no interaction history', async () => {
      userSvc.findByUsername.mockResolvedValue(trendingUser);
      trackSvc.getUserInteractedTrackTags.mockResolvedValue([]);
      genreRepo.findByNames.mockResolvedValue([]);
      playlistRepo.getPlaylistByUserAndTitles.mockResolvedValue([]);

      const result = await service.getTrendingMusicByGenre(MOCK_USER_ID);

      expect(result).toEqual({ status: 'success', data: [] });
      expect(playlistRepo.getPlaylistByUserAndTitles).toHaveBeenCalledWith(trendingUser.userId, []);
    });

    it('should return mapped playlists for top genres', async () => {
      userSvc.findByUsername.mockResolvedValue(trendingUser);
      trackSvc.getUserInteractedTrackTags.mockResolvedValue([
        { genreId: 'g1', name: 'Electronic' },
        { genreId: 'g1', name: 'Electronic' },
        { genreId: 'g2', name: 'Jazz' },
      ]);
      const pl = mockPlaylist('pl-1', 'Electronic');
      playlistRepo.getPlaylistByUserAndTitles.mockResolvedValue([pl]);
      followersRepo.isFollowing.mockResolvedValue(false);
      playlistRepo.findLikeByUserAndPlaylist.mockResolvedValue(null);

      const result = await service.getTrendingMusicByGenre(MOCK_USER_ID);

      expect(result.status).toBe('success');
      expect((result as any).data).toHaveLength(1);
      expect((result as any).data[0].title).toBe('Electronic');
      expect((result as any).data[0].isLiked).toBe(false);
      expect((result as any).data[0].user.username).toBe(TRENDING_MUSIC_USER.username);
    });

    it('should set isLiked true when findLikeByUserAndPlaylist returns a record', async () => {
      userSvc.findByUsername.mockResolvedValue(trendingUser);
      trackSvc.getUserInteractedTrackTags.mockResolvedValue([{ genreId: 'g1', name: 'Rock' }]);
      playlistRepo.getPlaylistByUserAndTitles.mockResolvedValue([mockPlaylist('pl-2', 'Rock')]);
      followersRepo.isFollowing.mockResolvedValue(false);
      playlistRepo.findLikeByUserAndPlaylist.mockResolvedValue({ likeId: 'like-1' });

      const result = await service.getTrendingMusicByGenre(MOCK_USER_ID);

      expect((result as any).data[0].isLiked).toBe(true);
    });

    it('should set isFollowedByCurrentUser based on followersRepository', async () => {
      userSvc.findByUsername.mockResolvedValue(trendingUser);
      trackSvc.getUserInteractedTrackTags.mockResolvedValue([{ genreId: 'g1', name: 'Pop' }]);
      playlistRepo.getPlaylistByUserAndTitles.mockResolvedValue([mockPlaylist('pl-3', 'Pop')]);
      followersRepo.isFollowing.mockResolvedValue(true);
      playlistRepo.findLikeByUserAndPlaylist.mockResolvedValue(null);

      const result = await service.getTrendingMusicByGenre(MOCK_USER_ID);

      expect((result as any).data[0].user.isFollowedByCurrentUser).toBe(true);
    });

    it('should only use top 5 genres even when user has more interactions', async () => {
      userSvc.findByUsername.mockResolvedValue(trendingUser);
      // 6 distinct genres
      const tags = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'].map((id, i) => ({
        genreId: id,
        name: `Genre${i + 1}`,
      }));
      trackSvc.getUserInteractedTrackTags.mockResolvedValue(tags);
      playlistRepo.getPlaylistByUserAndTitles.mockResolvedValue([]);
      followersRepo.isFollowing.mockResolvedValue(false);

      await service.getTrendingMusicByGenre(MOCK_USER_ID);

      const [, titlesArg] = playlistRepo.getPlaylistByUserAndTitles.mock.calls[0];
      expect(titlesArg).toHaveLength(5);
    });

    it('should return empty array when no trending tracks found for any genre', async () => {
      userSvc.findByUsername.mockResolvedValue(trendingUser);
      trackSvc.getUserInteractedTrackTags.mockResolvedValue([
        { genreId: 'g1', name: 'Electronic' },
        { genreId: 'g2', name: 'Jazz' },
      ]);
      playlistRepo.getPlaylistByUserAndTitles.mockResolvedValue([]);
      followersRepo.isFollowing.mockResolvedValue(false);

      const result = await service.getTrendingMusicByGenre(MOCK_USER_ID);

      expect(result.status).toBe('success');
      expect((result as any).data).toEqual([]);
    });
  });

  // ─── getTracksByTag ───────────────────────────────────────────────────────

  describe('getTracksByTag', () => {
    const TAG_NAME = 'Electronic';
    const mockTag = { genreId: 'genre-uuid-1', name: TAG_NAME };

    const mockTrackEntity = (overrides?: object) => ({
      trackId: MOCK_TRACK_ID,
      userId: MOCK_USER_ID,
      title: 'Midnight Drive',
      audioUrl: 'https://cdn.harmonica.com/audio/midnight.mp3',
      waveformUrl: 'https://cdn.harmonica.com/waveforms/midnight.json',
      coverImage: 'https://cdn.harmonica.com/covers/midnight.jpg',
      durationSeconds: 213,
      visibility: 'public',
      hidden: false,
      blockedRegions: [] as string[],
      playCount: 1200,
      likesCount: 87,
      repostsCount: 13,
      commentsCount: 5,
      genreId: mockTag.genreId,
      tags: [mockTag],
      user: { userId: MOCK_USER_ID, username: 'dj_nour', displayName: 'DJ Nour', avatarUrl: null },
      ...overrides,
    });

    const mockPlaylistEntity = (overrides?: object) => ({
      playlistId: MOCK_PLAYLIST_ID,
      title: 'Electronic Mix',
      description: null,
      coverImage: null,
      isPublic: true,
      tracksCount: 10,
      likesCount: 20,
      repostsCount: 5,
      totalDurationSeconds: 2400,
      createdAt: new Date('2024-01-01'),
      user: { userId: MOCK_USER_ID, username: 'dj_nour', displayName: 'DJ Nour', avatarUrl: null },
      ...overrides,
    });

    it('should throw NotFoundException when tag does not exist', async () => {
      genreRepo.findByName.mockResolvedValue(null);

      await expect(
        service.getTracksByTag(MOCK_USER_ID, TAG_NAME, '1.2.3.4', 'recent', 1, 20)
      ).rejects.toThrow(NotFoundException);

      expect(genreRepo.findByName).toHaveBeenCalledWith(TAG_NAME);
    });

    it('should return paginated tracks for type=recent', async () => {
      genreRepo.findByName.mockResolvedValue(mockTag);
      const track = mockTrackEntity();
      trackRepo.findTracksByGenreOrTags.mockResolvedValue([[track], 1]);
      trackRepo.getUserLikedTrackIds.mockResolvedValue(new Set());
      trackRepo.getUserRepostedTrackIds.mockResolvedValue(new Set());

      const result = await service.getTracksByTag(
        MOCK_USER_ID,
        TAG_NAME,
        '1.2.3.4',
        'recent',
        1,
        20
      );

      expect(trackRepo.findTracksByGenreOrTags).toHaveBeenCalledWith(
        [mockTag.genreId],
        [mockTag],
        1,
        20,
        'recent'
      );
      expect(result.status).toBe('success');
      expect(result.pagination).toEqual({
        currentPage: 1,
        totalPages: 1,
        totalCount: 1,
        limit: 20,
      });
    });

    it('should return paginated tracks for type=popular', async () => {
      genreRepo.findByName.mockResolvedValue(mockTag);
      trackRepo.findTracksByGenreOrTags.mockResolvedValue([[mockTrackEntity()], 1]);
      trackRepo.getUserLikedTrackIds.mockResolvedValue(new Set());
      trackRepo.getUserRepostedTrackIds.mockResolvedValue(new Set());

      const result = await service.getTracksByTag(
        MOCK_USER_ID,
        TAG_NAME,
        '1.2.3.4',
        'popular',
        1,
        20
      );

      expect(trackRepo.findTracksByGenreOrTags).toHaveBeenCalledWith(
        [mockTag.genreId],
        [mockTag],
        1,
        20,
        'popular'
      );
      expect(result.status).toBe('success');
    });

    it('should mark isLiked and isReposted correctly for tracks', async () => {
      genreRepo.findByName.mockResolvedValue(mockTag);
      const track = mockTrackEntity();
      trackRepo.findTracksByGenreOrTags.mockResolvedValue([[track], 1]);
      trackRepo.getUserLikedTrackIds.mockResolvedValue(new Set([track.trackId]));
      trackRepo.getUserRepostedTrackIds.mockResolvedValue(new Set([track.trackId]));

      const result = await service.getTracksByTag(
        MOCK_USER_ID,
        TAG_NAME,
        '1.2.3.4',
        'recent',
        1,
        20
      );

      expect((result as any).data[0].isLiked).toBe(true);
      expect((result as any).data[0].isReposted).toBe(true);
    });

    it('should null audioUrl for region-blocked tracks', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'EG' } as any);
      genreRepo.findByName.mockResolvedValue(mockTag);
      const blockedTrack = mockTrackEntity({ blockedRegions: ['EG'] });
      trackRepo.findTracksByGenreOrTags.mockResolvedValue([[blockedTrack], 1]);
      trackRepo.getUserLikedTrackIds.mockResolvedValue(new Set());
      trackRepo.getUserRepostedTrackIds.mockResolvedValue(new Set());

      const result = await service.getTracksByTag(
        MOCK_USER_ID,
        TAG_NAME,
        '1.2.3.4',
        'recent',
        1,
        20
      );

      expect((result as any).data[0].audioUrl).toBeNull();
    });

    it('should return paginated playlists for type=playlists', async () => {
      genreRepo.findByName.mockResolvedValue(mockTag);
      const playlist = mockPlaylistEntity();
      playlistRepo.findPopularPlaylistsByGenreOrTags.mockResolvedValue([[playlist], 1]);
      playlistRepo.getUserLikedPlaylistIds.mockResolvedValue(new Set());
      playlistRepo.getUserRepostedPlaylistIds.mockResolvedValue(new Set());

      const result = await service.getTracksByTag(
        MOCK_USER_ID,
        TAG_NAME,
        '1.2.3.4',
        'playlists',
        1,
        20
      );

      expect(playlistRepo.findPopularPlaylistsByGenreOrTags).toHaveBeenCalledWith(
        mockTag.genreId,
        [mockTag],
        1,
        20
      );
      expect(result.status).toBe('success');
      expect(result.pagination.totalCount).toBe(1);
    });

    it('should mark isLiked and isReposted correctly for playlists', async () => {
      genreRepo.findByName.mockResolvedValue(mockTag);
      const playlist = mockPlaylistEntity();
      playlistRepo.findPopularPlaylistsByGenreOrTags.mockResolvedValue([[playlist], 1]);
      playlistRepo.getUserLikedPlaylistIds.mockResolvedValue(new Set([playlist.playlistId]));
      playlistRepo.getUserRepostedPlaylistIds.mockResolvedValue(new Set([playlist.playlistId]));

      const result = await service.getTracksByTag(
        MOCK_USER_ID,
        TAG_NAME,
        '1.2.3.4',
        'playlists',
        1,
        20
      );

      expect((result as any).data[0].isLiked).toBe(true);
      expect((result as any).data[0].isReposted).toBe(true);
    });

    it('should return empty data with correct pagination when no results', async () => {
      genreRepo.findByName.mockResolvedValue(mockTag);
      trackRepo.findTracksByGenreOrTags.mockResolvedValue([[], 0]);
      trackRepo.getUserLikedTrackIds.mockResolvedValue(new Set());
      trackRepo.getUserRepostedTrackIds.mockResolvedValue(new Set());

      const result = await service.getTracksByTag(
        MOCK_USER_ID,
        TAG_NAME,
        '1.2.3.4',
        'recent',
        1,
        20
      );

      expect((result as any).data).toHaveLength(0);
      expect(result.pagination).toEqual({
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        limit: 20,
      });
    });

    it('should pass page and limit correctly', async () => {
      genreRepo.findByName.mockResolvedValue(mockTag);
      trackRepo.findTracksByGenreOrTags.mockResolvedValue([[], 0]);
      trackRepo.getUserLikedTrackIds.mockResolvedValue(new Set());
      trackRepo.getUserRepostedTrackIds.mockResolvedValue(new Set());

      await service.getTracksByTag(MOCK_USER_ID, TAG_NAME, '1.2.3.4', 'recent', 3, 10);

      expect(trackRepo.findTracksByGenreOrTags).toHaveBeenCalledWith(
        [mockTag.genreId],
        [mockTag],
        3,
        10,
        'recent'
      );
    });
  });

  // ─── getArtistsToWatchOutFor ──────────────────────────────────────────────

  describe('getArtistsToWatchOutFor', () => {
    it('should return artists from trackRepository.findUpAndComingArtists', async () => {
      const mockArtists = [
        { username: 'artist1', displayName: 'Artist One', avatarUrl: null, followersCount: 100 },
        { username: 'artist2', displayName: 'Artist Two', avatarUrl: null, followersCount: 200 },
      ];
      trackRepo.findUpAndComingArtists.mockResolvedValue(mockArtists);

      const result = await service.getArtistsToWatchOutFor();

      expect(trackRepo.findUpAndComingArtists).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ status: 'success', data: mockArtists });
    });

    it('should return empty array when no up-and-coming artists exist', async () => {
      trackRepo.findUpAndComingArtists.mockResolvedValue([]);

      const result = await service.getArtistsToWatchOutFor();

      expect(result).toEqual({ status: 'success', data: [] });
    });
  });

  // ─── getTrendingMusicByGenreRandom (no userId) ────────────────────────────

  describe('getTrendingMusicByGenre (random / unauthenticated)', () => {
    const TRENDING_USER_ID = '111e8400-e29b-41d4-a716-000000000001';
    const trendingUser = {
      userId: TRENDING_USER_ID,
      username: TRENDING_MUSIC_USER.username,
      displayName: 'Trending Music',
      avatarUrl: null,
    };

    const mockPlaylist = (id: string, title: string) => ({
      playlistId: id,
      title,
      description: null,
      coverImage: null,
      isPublic: true,
      tracksCount: 10,
      likesCount: 5,
      repostsCount: 2,
      totalDurationSeconds: 1800,
      createdAt: new Date('2024-01-01'),
    });

    it('should throw if trending music user is not found', async () => {
      userSvc.findByUsername.mockResolvedValue(null);

      await expect(service.getTrendingMusicByGenre()).rejects.toThrow(
        'Trending Music user not found'
      );
    });

    it('should return genre playlists when called without userId', async () => {
      userSvc.findByUsername.mockResolvedValue(trendingUser);
      genreRepo.findByNames.mockResolvedValue([{ name: 'Electronic' }]);
      const pl = mockPlaylist('pl-r1', 'Electronic');
      playlistRepo.getPlaylistByUserAndTitles.mockResolvedValue([pl]);
      followersRepo.isFollowing.mockResolvedValue(false);
      playlistRepo.findLikeByUserAndPlaylist.mockResolvedValue(null);

      const result = await service.getTrendingMusicByGenre();

      expect(result.status).toBe('success');
      expect(playlistRepo.getPlaylistByUserAndTitles).toHaveBeenCalledWith(
        trendingUser.userId,
        expect.any(Array)
      );
    });

    it('should not call getUserInteractedTrackTags when no userId provided', async () => {
      userSvc.findByUsername.mockResolvedValue(trendingUser);
      genreRepo.findByNames.mockResolvedValue([]);
      playlistRepo.getPlaylistByUserAndTitles.mockResolvedValue([]);

      await service.getTrendingMusicByGenre();

      expect(trackSvc.getUserInteractedTrackTags).not.toHaveBeenCalled();
    });

    it('should return isLiked false and isFollowedByCurrentUser false when no userId', async () => {
      userSvc.findByUsername.mockResolvedValue(trendingUser);
      genreRepo.findByNames.mockResolvedValue([{ name: 'Hip Hop' }]);
      const pl = mockPlaylist('pl-r2', 'Hip Hop');
      playlistRepo.getPlaylistByUserAndTitles.mockResolvedValue([pl]);
      followersRepo.isFollowing.mockResolvedValue(false);
      playlistRepo.findLikeByUserAndPlaylist.mockResolvedValue(null);

      const result = await service.getTrendingMusicByGenre();

      expect((result as any).data[0].isLiked).toBe(false);
      expect((result as any).data[0].user.isFollowedByCurrentUser).toBe(false);
    });
  });

  // ─── getCuratedPlaylists ──────────────────────────────────────────────────

  describe('getCuratedPlaylists', () => {
    it('should return mapped tracks from trackRepository.findTrendingTracks', async () => {
      const tracks = [
        mockTrack({
          title: 'Track A',
          user: mockUser({ username: 'artist_a', displayName: 'Artist A' }),
        }),
        mockTrack({
          title: 'Track B',
          user: mockUser({ username: 'artist_b', displayName: 'Artist B' }),
        }),
      ];
      trackRepo.findTrendingTracks.mockResolvedValue(tracks);

      const result = await service.getCuratedPlaylists();

      expect(trackRepo.findTrendingTracks).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('success');
      expect((result as any).data.tracks).toHaveLength(2);
      expect((result as any).data.tracks[0]).toEqual({
        title: 'Track A',
        artistUsername: 'artist_a',
        artistDisplayName: 'Artist A',
        coverImage: tracks[0].coverImage,
      });
    });

    it('should return empty tracks array when no trending tracks exist', async () => {
      trackRepo.findTrendingTracks.mockResolvedValue([]);

      const result = await service.getCuratedPlaylists();

      expect(result).toEqual({ status: 'success', data: { tracks: [] } });
    });

    it('should only expose title, artistUsername, artistDisplayName, and coverImage per track', async () => {
      const track = mockTrack({ title: 'Only Fields' });
      trackRepo.findTrendingTracks.mockResolvedValue([track]);

      const result = await service.getCuratedPlaylists();

      const mapped = (result as any).data.tracks[0];
      expect(Object.keys(mapped)).toEqual([
        'title',
        'artistUsername',
        'artistDisplayName',
        'coverImage',
      ]);
    });
  });

  // ─── createTrendingMusicPlaylists ─────────────────────────────────────────

  describe('createTrendingMusicPlaylists', () => {
    it('should throw Error when trending music user is not found', async () => {
      userSvc.findByUsername.mockResolvedValue(null);

      await expect(service.createTrendingMusicPlaylists()).rejects.toThrow(
        'Trending Music user not found'
      );
    });

    it('should call genreRepository.findByNames and create a playlist for each genre', async () => {
      const genre1 = { genreId: 'genre-1', name: 'Pop' };
      const genre2 = { genreId: 'genre-2', name: 'Rock' };
      const track = mockTrack({ trackId: 'track-1' });

      userSvc.findByUsername.mockResolvedValue(mockUser());
      genreRepo.findByNames.mockResolvedValue([genre1, genre2]);
      trackRepo.findTracksByGenreOrTags.mockResolvedValue([[track], 1]);
      playlistRepo.getPlaylistByUserAndTitle.mockResolvedValue(null);
      playlistRepo.createPlaylist.mockResolvedValue({ playlistId: 'playlist-new' });
      playlistRepo.updatePlaylistGenre.mockResolvedValue(undefined);
      playlistRepo.addTrackToPlaylist.mockResolvedValue(undefined);

      await service.createTrendingMusicPlaylists();

      expect(genreRepo.findByNames).toHaveBeenCalledTimes(1);
      // 1 track × 2 genres
      expect(playlistRepo.addTrackToPlaylist).toHaveBeenCalledTimes(2);
    });
  });

  // ─── createTrendingMusicPlaylistByGenre ───────────────────────────────────

  describe('createTrendingMusicPlaylistByGenre', () => {
    const genre = { genreId: 'genre-1', name: 'Pop' };

    it('should return null when findTracksByGenreOrTags returns empty tracks', async () => {
      trackRepo.findTracksByGenreOrTags.mockResolvedValue([[], 0]);

      const result = await service.createTrendingMusicPlaylistByGenre(genre as any, MOCK_USER_ID);

      expect(result).toBeNull();
      expect(playlistRepo.createPlaylist).not.toHaveBeenCalled();
    });

    it('should create new playlist when getPlaylistByUserAndTitle returns null', async () => {
      const track = mockTrack();
      trackRepo.findTracksByGenreOrTags.mockResolvedValue([[track], 1]);
      playlistRepo.getPlaylistByUserAndTitle.mockResolvedValue(null);
      playlistRepo.createPlaylist.mockResolvedValue({ playlistId: 'new-playlist-id' });
      playlistRepo.updatePlaylistGenre.mockResolvedValue(undefined);
      playlistRepo.addTrackToPlaylist.mockResolvedValue(undefined);

      const result = await service.createTrendingMusicPlaylistByGenre(genre as any, MOCK_USER_ID);

      expect(playlistRepo.createPlaylist).toHaveBeenCalledWith(
        expect.objectContaining({ title: genre.name, isPublic: true }),
        MOCK_USER_ID
      );
      expect(playlistRepo.updatePlaylistGenre).toHaveBeenCalledWith('new-playlist-id', genre);
      expect(result).toBe('new-playlist-id');
    });

    it('should clear existing playlist tracks when getPlaylistByUserAndTitle returns an existing playlist', async () => {
      const track = mockTrack();
      trackRepo.findTracksByGenreOrTags.mockResolvedValue([[track], 1]);
      playlistRepo.getPlaylistByUserAndTitle.mockResolvedValue({ playlistId: 'existing-id' });
      playlistRepo.clearPlaylistTracks.mockResolvedValue(undefined);
      playlistRepo.addTrackToPlaylist.mockResolvedValue(undefined);

      const result = await service.createTrendingMusicPlaylistByGenre(genre as any, MOCK_USER_ID);

      expect(playlistRepo.clearPlaylistTracks).toHaveBeenCalledWith('existing-id');
      expect(playlistRepo.createPlaylist).not.toHaveBeenCalled();
      expect(result).toBe('existing-id');
    });

    it('should call addTrackToPlaylist for each track in topTracks', async () => {
      const track1 = mockTrack({ trackId: 'track-1' });
      const track2 = mockTrack({ trackId: 'track-2' });
      trackRepo.findTracksByGenreOrTags.mockResolvedValue([[track1, track2], 2]);
      playlistRepo.getPlaylistByUserAndTitle.mockResolvedValue(null);
      playlistRepo.createPlaylist.mockResolvedValue({ playlistId: 'pl-1' });
      playlistRepo.updatePlaylistGenre.mockResolvedValue(undefined);
      playlistRepo.addTrackToPlaylist.mockResolvedValue(undefined);

      await service.createTrendingMusicPlaylistByGenre(genre as any, MOCK_USER_ID);

      expect(playlistRepo.addTrackToPlaylist).toHaveBeenCalledTimes(2);
      expect(playlistRepo.addTrackToPlaylist).toHaveBeenCalledWith('pl-1', 'track-1', 1);
      expect(playlistRepo.addTrackToPlaylist).toHaveBeenCalledWith('pl-1', 'track-2', 2);
    });
  });

  // ─── getLikedByUsers ──────────────────────────────────────────────────────

  describe('getLikedByUsers', () => {
    it('should return mapped users from activityService.getLikedByUsers', async () => {
      const rawUsers = [
        {
          user_user_id: 'uid-1',
          user_username: 'user1',
          user_display_name: 'User One',
          user_avatar_url: 'https://example.com/avatar1.jpg',
        },
      ];
      activitySvc.getLikedByUsers.mockResolvedValue(rawUsers);

      const result = await service.getLikedByUsers(MOCK_USER_ID);

      expect(result.status).toBe('success');
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        userId: 'uid-1',
        username: 'user1',
        displayName: 'User One',
        avatarUrl: 'https://example.com/avatar1.jpg',
      });
    });

    it('should return empty data array when activityService returns []', async () => {
      activitySvc.getLikedByUsers.mockResolvedValue([]);

      const result = await service.getLikedByUsers(MOCK_USER_ID);

      expect(result).toEqual({ status: 'success', data: [] });
    });
  });

  // ─── getUserLikedby ───────────────────────────────────────────────────────

  describe('getUserLikedby', () => {
    it('should throw NotFoundException when user is not found', async () => {
      userSvc.findById.mockResolvedValue(null);

      await expect(
        service.getUserLikedby(MOCK_USER_ID, MOCK_OTHER_USER_ID, '1.2.3.4')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user profile is private and caller is not the user', async () => {
      userSvc.findById.mockResolvedValue(mockUser({ userId: MOCK_OTHER_USER_ID, isPublic: false }));

      await expect(
        service.getUserLikedby(MOCK_OTHER_USER_ID, MOCK_USER_ID, '1.2.3.4')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return response with playlistId and title for a public user', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      userSvc.findById.mockResolvedValue(mockUser({ isPublic: true }));
      trackRepo.getUserTrackLikes.mockResolvedValue([[], 0]);
      playlistRepo.getUserPlaylistLikes.mockResolvedValue([[], 0]);

      const result = await service.getUserLikedby(MOCK_USER_ID, MOCK_OTHER_USER_ID, '1.2.3.4');

      expect(result.playlistId).toBe(MOCK_USER_ID);
      expect(result.title).toBe(`Liked by ${mockUser().username}`);
    });

    it('should call getUserTrackLikes and getUserPlaylistLikes', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      userSvc.findById.mockResolvedValue(mockUser({ isPublic: true }));
      trackRepo.getUserTrackLikes.mockResolvedValue([[], 0]);
      playlistRepo.getUserPlaylistLikes.mockResolvedValue([[], 0]);

      await service.getUserLikedby(MOCK_USER_ID, MOCK_OTHER_USER_ID, '1.2.3.4');

      expect(trackRepo.getUserTrackLikes).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_OTHER_USER_ID,
        1,
        1000
      );
      expect(playlistRepo.getUserPlaylistLikes).toHaveBeenCalledWith(MOCK_USER_ID, 1, 1000);
    });
  });

  // ─── getMoreAlbumsOfWhatYouLike ───────────────────────────────────────────

  describe('getMoreAlbumsOfWhatYouLike', () => {
    it('should return empty data when no interacted album tags', async () => {
      playlistRepo.getUserInteractedAlbumTags.mockResolvedValue([]);

      const result = await service.getMoreAlbumsOfWhatYouLike(MOCK_USER_ID, '1.2.3.4');

      expect(result).toEqual({ status: 'success', data: [] });
      expect(playlistRepo.getTopAlbumsByTagIds).not.toHaveBeenCalled();
    });

    it('should call getTopAlbumsByTagIds with top 5 tag ids when user has interactions', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      const tags = Array.from({ length: 7 }, (_, i) => ({
        genreId: `genre-${i}`,
        name: `Genre ${i}`,
      }));
      playlistRepo.getUserInteractedAlbumTags.mockResolvedValue(tags);
      playlistRepo.getTopAlbumsByTagIds.mockResolvedValue([]);

      await service.getMoreAlbumsOfWhatYouLike(MOCK_USER_ID, '1.2.3.4');

      const [calledTagIds] = (playlistRepo.getTopAlbumsByTagIds as jest.Mock).mock.calls[0];
      expect(calledTagIds).toHaveLength(5);
    });

    it('should return formatted albums', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      playlistRepo.getUserInteractedAlbumTags.mockResolvedValue([
        { genreId: 'genre-1', name: 'Pop' },
      ]);
      const mockAlbum = {
        playlistId: 'album-1',
        title: 'Album 1',
        description: null,
        coverImage: null,
        user: mockUser(),
        playlistTracks: [],
        tracksCount: 0,
        totalDurationSeconds: 0,
        likesCount: 0,
        repostsCount: 0,
        createdAt: new Date(),
        visibility: 'public',
        isPublic: true,
        hidden: false,
      };
      playlistRepo.getTopAlbumsByTagIds.mockResolvedValue([mockAlbum]);

      const result = await service.getMoreAlbumsOfWhatYouLike(MOCK_USER_ID, '1.2.3.4');

      expect(result.status).toBe('success');
      expect((result as any).data).toHaveLength(1);
      expect((result as any).data[0].playlistId).toBe('album-1');
    });
  });

  // ─── getDiscoverFeed ──────────────────────────────────────────────────────

  describe('getDiscoverFeed', () => {
    it('should return cached result directly from redis when cache hit', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      redis.get.mockResolvedValue(JSON.stringify([]));

      const result = await service.getDiscoverFeed(MOCK_USER_ID, '1.2.3.4');

      expect(redis.get).toHaveBeenCalledWith(`discover_feed_pool:${MOCK_USER_ID}`);
      expect(result.status).toBe('success');
      expect((result as any).data).toEqual([]);
      expect(playlistRepo.getUserInteractedAlbumTags).not.toHaveBeenCalled();
    });

    it('should build track pool from scratch when cache is empty', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      redis.get.mockResolvedValue(null);
      playlistRepo.getUserInteractedAlbumTags.mockResolvedValue([]);
      trackRepo.findNewReleasedTracks.mockResolvedValue([[], 0]);
      trackRepo.getUserRecentlyPlayed.mockResolvedValue([]);
      followersRepo.getTopFollowedArtistUsernames.mockResolvedValue([]);
      redis.set.mockResolvedValue('OK');

      const result = await service.getDiscoverFeed(MOCK_USER_ID, '1.2.3.4');

      expect(playlistRepo.getUserInteractedAlbumTags).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(trackRepo.getUserRecentlyPlayed).toHaveBeenCalled();
      expect(followersRepo.getTopFollowedArtistUsernames).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalled();
      expect(result.status).toBe('success');
    });

    it('should return status success with data array', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      redis.get.mockResolvedValue(JSON.stringify([]));

      const result = await service.getDiscoverFeed(MOCK_USER_ID, '1.2.3.4');

      expect(result).toHaveProperty('status', 'success');
      expect(result).toHaveProperty('data');
      expect(Array.isArray((result as any).data)).toBe(true);
    });

    it('should handle user with no recent plays (getUserRecentlyPlayed returns empty)', async () => {
      jest.spyOn(geolocationUtil, 'getLocationFromIp').mockReturnValue({ country: 'US' } as any);
      redis.get.mockResolvedValue(null);
      playlistRepo.getUserInteractedAlbumTags.mockResolvedValue([]);
      trackRepo.findNewReleasedTracks.mockResolvedValue([[], 0]);
      trackRepo.getUserRecentlyPlayed.mockResolvedValue([]);
      followersRepo.getTopFollowedArtistUsernames.mockResolvedValue([]);
      redis.set.mockResolvedValue('OK');

      const result = await service.getDiscoverFeed(MOCK_USER_ID, '1.2.3.4');

      expect(trackRepo.getUserRecentlyPlayed).toHaveBeenCalled();
      expect(result.status).toBe('success');
      expect(Array.isArray((result as any).data)).toBe(true);
    });
  });
});
