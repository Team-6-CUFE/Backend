import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DownloadService } from './download.service';
import { TrackRepository } from '../track/track.repository';
import { DownloadRepository } from './download.repository';
import { PlaylistRepository } from '../playlist/playlist.repository';
import { DownloadSource } from './entities/downloaded-tracks.entity';
import { DownloadStatus } from './enums/download-status.enum';
import { TrackVisibility } from '../track/enums/track-visibility.enum';
import * as geolocation from '../common/utilities/geolocation.util';

jest.mock('../common/utilities/geolocation.util');

const mockTrack = (overrides = {}) => ({
  trackId: 'track-uuid-1',
  title: 'Test Track',
  offlineListening: true,
  visibility: TrackVisibility.PUBLIC,
  blockedRegions: [],
  coverImage: null,
  audioUrl: 'https://cdn.example.com/audio.mp3',
  waveformUrl: null,
  durationSeconds: 180,
  playCount: 0,
  likesCount: 0,
  repostsCount: 0,
  commentsCount: 0,
  mainArtists: [],
  createdAt: new Date(),
  user: null,
  genre: null,
  ...overrides,
});

const mockPlaylistTrack = (trackOverrides = {}) => ({
  trackId: 'track-uuid-1',
  track: mockTrack(trackOverrides),
});

const mockPlaylist = (overrides = {}) => ({
  playlistId: 'playlist-uuid-1',
  title: 'Test Playlist',
  isPublic: true,
  playlistTracks: [mockPlaylistTrack()],
  tracksCount: 1,
  totalDurationSeconds: 180,
  likesCount: 0,
  repostsCount: 0,
  createdAt: new Date(),
  user: null,
  ...overrides,
});

const mockDownloadedTrack = (overrides = {}) => ({
  downloadId: 'download-uuid-1',
  userId: 'user-uuid-1',
  trackId: 'track-uuid-1',
  sourcePlaylistId: null,
  source: DownloadSource.TRACK,
  status: DownloadStatus.PENDING,
  downloadedAt: new Date(),
  track: mockTrack(),
  ...overrides,
});

describe('DownloadService', () => {
  let service: DownloadService;
  let trackRepository: jest.Mocked<TrackRepository>;
  let downloadRepository: jest.Mocked<DownloadRepository>;
  let playlistRepository: jest.Mocked<PlaylistRepository>;

  const userId = 'user-uuid-1';
  const trackId = 'track-uuid-1';
  const playlistId = 'playlist-uuid-1';
  const ip = '1.2.3.4';

  beforeEach(async () => {
    jest.useFakeTimers();
    (geolocation.getLocationFromIp as jest.Mock).mockReturnValue({ country: 'US' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DownloadService,
        {
          provide: TrackRepository,
          useValue: {
            findById: jest.fn(),
            getDownloadedTracksByUser: jest.fn(),
            getUserLikedTrackIds: jest.fn(),
            getUserRepostedTrackIds: jest.fn(),
          },
        },
        {
          provide: DownloadRepository,
          useValue: {
            getDownloadedTrack: jest.fn(),
            saveDownloadedTrack: jest.fn(),
            updateDownloadedTrackStatus: jest.fn(),
            deleteDownloadedTrack: jest.fn(),
            getDownloadedPlaylist: jest.fn(),
            saveDownloadedPlaylist: jest.fn(),
            updateDownloadedPlaylistStatus: jest.fn(),
            deleteDownloadedPlaylist: jest.fn(),
            getDownloadedTracksByPlaylistIds: jest.fn(),
          },
        },
        {
          provide: PlaylistRepository,
          useValue: {
            getPlaylistDetails: jest.fn(),
            getDownloadedPlaylistsByUser: jest.fn(),
            getUserLikedPlaylistIds: jest.fn(),
            getUserRepostedPlaylistIds: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DownloadService>(DownloadService);
    trackRepository = module.get(TrackRepository);
    downloadRepository = module.get(DownloadRepository);
    playlistRepository = module.get(PlaylistRepository);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // ─── downloadTrack ──────────────────────────────────────────────────────────

  describe('downloadTrack', () => {
    it('should throw BadRequestException if track is not found', async () => {
      trackRepository.findById.mockResolvedValue(null);

      await expect(service.downloadTrack(trackId, userId, ip)).rejects.toThrow(
        new BadRequestException('Track not found')
      );
    });

    it('should throw ForbiddenException if track has offline listening disabled', async () => {
      trackRepository.findById.mockResolvedValue(mockTrack({ offlineListening: false }) as any);

      await expect(service.downloadTrack(trackId, userId, ip)).rejects.toThrow(
        new ForbiddenException('Track is not available for download')
      );
    });

    it('should throw ForbiddenException if track is private', async () => {
      trackRepository.findById.mockResolvedValue(
        mockTrack({ visibility: TrackVisibility.PRIVATE }) as any
      );

      await expect(service.downloadTrack(trackId, userId, ip)).rejects.toThrow(
        new ForbiddenException('Track is private and cannot be downloaded')
      );
    });

    it('should throw ForbiddenException if track is blocked in user region', async () => {
      (geolocation.getLocationFromIp as jest.Mock).mockReturnValue({ country: 'EG' });
      trackRepository.findById.mockResolvedValue(mockTrack({ blockedRegions: ['EG'] }) as any);

      await expect(service.downloadTrack(trackId, userId, ip)).rejects.toThrow(
        new ForbiddenException('Track is not available in your region')
      );
    });

    it('should throw BadRequestException if track is already downloaded', async () => {
      trackRepository.findById.mockResolvedValue(mockTrack() as any);
      downloadRepository.getDownloadedTrack.mockResolvedValue(mockDownloadedTrack() as any);

      await expect(service.downloadTrack(trackId, userId, ip)).rejects.toThrow(
        new BadRequestException('Track has already been downloaded by this user')
      );
    });

    it('should save and complete the download successfully', async () => {
      trackRepository.findById.mockResolvedValue(mockTrack() as any);
      downloadRepository.getDownloadedTrack.mockResolvedValue(null);
      downloadRepository.saveDownloadedTrack.mockResolvedValue(mockDownloadedTrack() as any);
      downloadRepository.updateDownloadedTrackStatus.mockResolvedValue(undefined);

      const promise = service.downloadTrack(trackId, userId, ip);
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(downloadRepository.saveDownloadedTrack).toHaveBeenCalledWith(userId, trackId);
      expect(downloadRepository.updateDownloadedTrackStatus).toHaveBeenCalledWith(
        'download-uuid-1',
        DownloadStatus.COMPLETED
      );
      expect(result).toEqual({
        status: 'success',
        message: 'Track downloaded successfully',
        downloadId: 'download-uuid-1',
      });
    });

    it('should not block download when region check passes (no blocked region)', async () => {
      (geolocation.getLocationFromIp as jest.Mock).mockReturnValue({ country: null });
      trackRepository.findById.mockResolvedValue(mockTrack({ blockedRegions: ['EG'] }) as any);
      downloadRepository.getDownloadedTrack.mockResolvedValue(null);
      downloadRepository.saveDownloadedTrack.mockResolvedValue(mockDownloadedTrack() as any);
      downloadRepository.updateDownloadedTrackStatus.mockResolvedValue(undefined);

      const promise = service.downloadTrack(trackId, userId, ip);
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('success');
    });
  });

  // ─── deleteDownloadedTrack ──────────────────────────────────────────────────

  describe('deleteDownloadedTrack', () => {
    it('should throw BadRequestException if track was not downloaded', async () => {
      downloadRepository.getDownloadedTrack.mockResolvedValue(null);

      await expect(service.deleteDownloadedTrack(trackId, userId)).rejects.toThrow(
        new BadRequestException('Track has not been downloaded by this user')
      );
    });

    it('should delete the downloaded track successfully', async () => {
      downloadRepository.getDownloadedTrack.mockResolvedValue(mockDownloadedTrack() as any);
      downloadRepository.deleteDownloadedTrack.mockResolvedValue(undefined);

      const result = await service.deleteDownloadedTrack(trackId, userId);

      expect(downloadRepository.deleteDownloadedTrack).toHaveBeenCalledWith(trackId, userId);
      expect(result).toEqual({
        status: 'success',
        message: 'Downloaded track deleted successfully',
      });
    });
  });

  // ─── downloadPlaylist ───────────────────────────────────────────────────────

  describe('downloadPlaylist', () => {
    it('should throw BadRequestException if playlist is not found', async () => {
      playlistRepository.getPlaylistDetails.mockResolvedValue(null);

      await expect(service.downloadPlaylist(playlistId, userId, ip)).rejects.toThrow(
        new BadRequestException('Playlist not found')
      );
    });

    it('should throw BadRequestException if playlist has no tracks', async () => {
      playlistRepository.getPlaylistDetails.mockResolvedValue(
        mockPlaylist({ playlistTracks: [] }) as any
      );

      await expect(service.downloadPlaylist(playlistId, userId, ip)).rejects.toThrow(
        new BadRequestException('Playlist has no tracks to download')
      );
    });

    it('should throw ForbiddenException if playlist is private', async () => {
      playlistRepository.getPlaylistDetails.mockResolvedValue(
        mockPlaylist({ isPublic: false }) as any
      );

      await expect(service.downloadPlaylist(playlistId, userId, ip)).rejects.toThrow(
        new ForbiddenException('Playlist is private and cannot be downloaded')
      );
    });

    it('should throw BadRequestException if playlist is already downloaded', async () => {
      playlistRepository.getPlaylistDetails.mockResolvedValue(mockPlaylist() as any);
      downloadRepository.getDownloadedPlaylist.mockResolvedValue({ playlistId, userId } as any);

      await expect(service.downloadPlaylist(playlistId, userId, ip)).rejects.toThrow(
        new BadRequestException('Playlist has already been downloaded by this user')
      );
    });

    it('should skip tracks that have offline listening disabled', async () => {
      const playlist = mockPlaylist({
        playlistTracks: [
          mockPlaylistTrack({ offlineListening: false }),
          mockPlaylistTrack({ trackId: 'track-uuid-2', offlineListening: true }),
        ],
      });
      playlistRepository.getPlaylistDetails.mockResolvedValue(playlist as any);
      downloadRepository.getDownloadedPlaylist.mockResolvedValue(null);
      downloadRepository.saveDownloadedPlaylist.mockResolvedValue(undefined as any);
      downloadRepository.saveDownloadedTrack.mockResolvedValue(
        mockDownloadedTrack({ trackId: 'track-uuid-2' }) as any
      );
      downloadRepository.updateDownloadedTrackStatus.mockResolvedValue(undefined);
      downloadRepository.updateDownloadedPlaylistStatus.mockResolvedValue(undefined);

      const promise = service.downloadPlaylist(playlistId, userId, ip);
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result.skippedTracks).toBe(1);
      expect(result.downloadedTracks).toBe(1);
    });

    it('should skip tracks that are private', async () => {
      const playlist = mockPlaylist({
        playlistTracks: [mockPlaylistTrack({ visibility: TrackVisibility.PRIVATE })],
      });
      playlistRepository.getPlaylistDetails.mockResolvedValue(playlist as any);
      downloadRepository.getDownloadedPlaylist.mockResolvedValue(null);
      downloadRepository.saveDownloadedPlaylist.mockResolvedValue(undefined as any);
      downloadRepository.updateDownloadedPlaylistStatus.mockResolvedValue(undefined);

      const promise = service.downloadPlaylist(playlistId, userId, ip);
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result.skippedTracks).toBe(1);
      expect(result.downloadedTracks).toBe(0);
    });

    it('should skip region-blocked tracks', async () => {
      (geolocation.getLocationFromIp as jest.Mock).mockReturnValue({ country: 'EG' });
      const playlist = mockPlaylist({
        playlistTracks: [mockPlaylistTrack({ blockedRegions: ['EG'] })],
      });
      playlistRepository.getPlaylistDetails.mockResolvedValue(playlist as any);
      downloadRepository.getDownloadedPlaylist.mockResolvedValue(null);
      downloadRepository.saveDownloadedPlaylist.mockResolvedValue(undefined as any);
      downloadRepository.updateDownloadedPlaylistStatus.mockResolvedValue(undefined);

      const promise = service.downloadPlaylist(playlistId, userId, ip);
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result.skippedTracks).toBe(1);
      expect(result.downloadedTracks).toBe(0);
    });

    it('should download all eligible tracks and return correct summary', async () => {
      const downloaded = mockDownloadedTrack({
        source: DownloadSource.PLAYLIST,
        sourcePlaylistId: playlistId,
      });
      playlistRepository.getPlaylistDetails.mockResolvedValue(mockPlaylist() as any);
      downloadRepository.getDownloadedPlaylist.mockResolvedValue(null);
      downloadRepository.saveDownloadedPlaylist.mockResolvedValue(undefined as any);
      downloadRepository.saveDownloadedTrack.mockResolvedValue(downloaded as any);
      downloadRepository.updateDownloadedTrackStatus.mockResolvedValue(undefined);
      downloadRepository.updateDownloadedPlaylistStatus.mockResolvedValue(undefined);

      const promise = service.downloadPlaylist(playlistId, userId, ip);
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result.status).toBe('success');
      expect(result.downloadedTracks).toBe(1);
      expect(result.skippedTracks).toBe(0);
      expect(downloadRepository.updateDownloadedPlaylistStatus).toHaveBeenCalledWith(
        playlistId,
        userId,
        DownloadStatus.COMPLETED
      );
    });
  });

  // ─── deleteDownloadedPlaylist ───────────────────────────────────────────────

  describe('deleteDownloadedPlaylist', () => {
    it('should throw BadRequestException if playlist was not downloaded', async () => {
      downloadRepository.deleteDownloadedPlaylist.mockResolvedValue(false);

      await expect(service.deleteDownloadedPlaylist(playlistId, userId)).rejects.toThrow(
        new BadRequestException('Playlist has not been downloaded by this user')
      );
    });

    it('should delete the downloaded playlist and its tracks successfully', async () => {
      downloadRepository.deleteDownloadedPlaylist.mockResolvedValue(true);

      const result = await service.deleteDownloadedPlaylist(playlistId, userId);

      expect(downloadRepository.deleteDownloadedPlaylist).toHaveBeenCalledWith(playlistId, userId);
      expect(result).toEqual({
        status: 'success',
        message: 'Downloaded playlist and associated tracks deleted successfully',
      });
    });
  });

  // ─── getDownloadedList ──────────────────────────────────────────────────────

  describe('getDownloadedList', () => {
    const track = mockTrack() as any;
    const playlist = mockPlaylist() as any;
    const playlistDownloadedTrack = mockDownloadedTrack({
      source: DownloadSource.PLAYLIST,
      sourcePlaylistId: playlistId,
      track,
    }) as any;

    beforeEach(() => {
      trackRepository.getDownloadedTracksByUser.mockResolvedValue([[track], 1]);
      playlistRepository.getDownloadedPlaylistsByUser.mockResolvedValue([[playlist], 1]);
      downloadRepository.getDownloadedTracksByPlaylistIds.mockResolvedValue([
        playlistDownloadedTrack,
      ]);
      trackRepository.getUserLikedTrackIds.mockResolvedValue(new Set(['track-uuid-1']));
      trackRepository.getUserRepostedTrackIds.mockResolvedValue(new Set());
      playlistRepository.getUserLikedPlaylistIds.mockResolvedValue(new Set());
      playlistRepository.getUserRepostedPlaylistIds.mockResolvedValue(new Set());
    });

    it('should return paginated tracks and playlists', async () => {
      const result = await service.getDownloadedList(userId, 1, 20);

      expect(result.status).toBe('success');
      expect(result.data.tracks.total).toBe(1);
      expect(result.data.playlists.total).toBe(1);
      expect(result.data.tracks.items).toHaveLength(1);
      expect(result.data.playlists.items).toHaveLength(1);
    });

    it('should mark isLiked correctly for tracks', async () => {
      const result = await service.getDownloadedList(userId, 1, 20);

      expect(result.data.tracks.items[0].isLiked).toBe(true);
      expect(result.data.tracks.items[0].isReposted).toBe(false);
    });

    it('should include downloaded tracks inside each playlist', async () => {
      const result = await service.getDownloadedList(userId, 1, 20);

      expect(result.data.playlists.items[0].playlistTracks).toHaveLength(1);
      expect(result.data.playlists.items[0].playlistTracks[0].trackId).toBe('track-uuid-1');
    });

    it('should batch liked/reposted lookups using all unique track IDs', async () => {
      await service.getDownloadedList(userId, 1, 20);

      const calledWith = trackRepository.getUserLikedTrackIds.mock.calls[0][1];
      // both individual track and playlist track are the same UUID → deduped to 1
      expect(calledWith).toHaveLength(1);
    });

    it('should return empty arrays when user has no downloads', async () => {
      trackRepository.getDownloadedTracksByUser.mockResolvedValue([[], 0]);
      playlistRepository.getDownloadedPlaylistsByUser.mockResolvedValue([[], 0]);
      downloadRepository.getDownloadedTracksByPlaylistIds.mockResolvedValue([]);
      trackRepository.getUserLikedTrackIds.mockResolvedValue(new Set());
      trackRepository.getUserRepostedTrackIds.mockResolvedValue(new Set());
      playlistRepository.getUserLikedPlaylistIds.mockResolvedValue(new Set());
      playlistRepository.getUserRepostedPlaylistIds.mockResolvedValue(new Set());

      const result = await service.getDownloadedList(userId, 1, 20);

      expect(result.data.tracks.items).toHaveLength(0);
      expect(result.data.playlists.items).toHaveLength(0);
      expect(result.data.tracks.total).toBe(0);
      expect(result.data.playlists.total).toBe(0);
    });
  });
});
