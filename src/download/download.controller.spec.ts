import { Test, TestingModule } from '@nestjs/testing';
import { DownloadController } from './download.controller';
import { DownloadService } from './download.service';

describe('DownloadController', () => {
  let controller: DownloadController;
  let service: jest.Mocked<DownloadService>;

  const userId = 'user-uuid-1';
  const trackId = 'track-uuid-1';
  const playlistId = 'playlist-uuid-1';
  const ip = '1.2.3.4';

  const mockDownloadService = {
    downloadTrack: jest.fn(),
    deleteDownloadedTrack: jest.fn(),
    downloadPlaylist: jest.fn(),
    deleteDownloadedPlaylist: jest.fn(),
    getDownloadedList: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DownloadController],
      providers: [{ provide: DownloadService, useValue: mockDownloadService }],
    }).compile();

    controller = module.get<DownloadController>(DownloadController);
    service = module.get(DownloadService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── downloadTrack ──────────────────────────────────────────────────────────

  describe('downloadTrack', () => {
    it('should call service.downloadTrack with correct args and return the result', async () => {
      const expected = {
        status: 'success',
        message: 'Track downloaded successfully',
        downloadId: 'dl-1',
      };
      service.downloadTrack.mockResolvedValue(expected);

      const result = await controller.downloadTrack(trackId, userId, ip);

      expect(service.downloadTrack).toHaveBeenCalledWith(trackId, userId, ip);
      expect(result).toEqual(expected);
    });
  });

  // ─── deleteDownloadedTrack ──────────────────────────────────────────────────

  describe('deleteDownloadedTrack', () => {
    it('should call service.deleteDownloadedTrack with correct args and return the result', async () => {
      const expected = { status: 'success', message: 'Downloaded track deleted successfully' };
      service.deleteDownloadedTrack.mockResolvedValue(expected);

      const result = await controller.deleteDownloadedTrack(trackId, userId);

      expect(service.deleteDownloadedTrack).toHaveBeenCalledWith(trackId, userId);
      expect(result).toEqual(expected);
    });
  });

  // ─── downloadPlaylist ───────────────────────────────────────────────────────

  describe('downloadPlaylist', () => {
    it('should call service.downloadPlaylist with correct args and return the result', async () => {
      const expected = {
        status: 'success',
        message: 'Playlist downloaded successfully',
        downloadedTracks: 5,
        downloadedTrackIds: [],
        downloadIds: [],
        skippedTracks: 0,
        skippedTrackIds: [],
      };
      service.downloadPlaylist.mockResolvedValue(expected);

      const result = await controller.downloadPlaylist(playlistId, userId, ip);

      expect(service.downloadPlaylist).toHaveBeenCalledWith(playlistId, userId, ip);
      expect(result).toEqual(expected);
    });
  });

  // ─── deleteDownloadedPlaylist ───────────────────────────────────────────────

  describe('deleteDownloadedPlaylist', () => {
    it('should call service.deleteDownloadedPlaylist with correct args and return the result', async () => {
      const expected = {
        status: 'success',
        message: 'Downloaded playlist and associated tracks deleted successfully',
      };
      service.deleteDownloadedPlaylist.mockResolvedValue(expected);

      const result = await controller.deleteDownloadedPlaylist(playlistId, userId);

      expect(service.deleteDownloadedPlaylist).toHaveBeenCalledWith(playlistId, userId);
      expect(result).toEqual(expected);
    });
  });

  // ─── getDownloadedList ──────────────────────────────────────────────────────

  describe('getDownloadedList', () => {
    it('should call service.getDownloadedList with default pagination and return the result', async () => {
      const expected = {
        status: 'success',
        data: { tracks: { items: [], total: 0 }, playlists: { items: [], total: 0 } },
      };
      service.getDownloadedList.mockResolvedValue(expected);

      const result = await controller.getDownloadedList(userId);

      expect(service.getDownloadedList).toHaveBeenCalledWith(userId, 1, 20);
      expect(result).toEqual(expected);
    });

    it('should forward custom page and limit to the service', async () => {
      service.getDownloadedList.mockResolvedValue({ status: 'success', data: {} } as any);

      await controller.getDownloadedList(userId, 2, 10);

      expect(service.getDownloadedList).toHaveBeenCalledWith(userId, 2, 10);
    });
  });
});
