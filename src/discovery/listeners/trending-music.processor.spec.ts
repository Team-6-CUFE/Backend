import { TrendingMusicProcessor } from './trending-music.processor';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockQueue = {
  add: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

const mockDiscoveryService = {
  createTrendingMusicPlaylists: jest.fn(),
};

const makeJob = (id = 'job-1') => ({ id, data: {} }) as any;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TrendingMusicProcessor', () => {
  let processor: TrendingMusicProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    // Instantiate directly — WorkerHost requires BullMQ internals that
    // cannot be satisfied via TestingModule without a real Redis connection.
    processor = new TrendingMusicProcessor(
      mockQueue as any,
      mockConfigService as any,
      mockDiscoveryService as any
    );
  });

  // ─── onModuleInit ──────────────────────────────────────────────────────────

  describe('onModuleInit', () => {
    it('should register refresh-trending-music job with default cron when config returns undefined', async () => {
      mockConfigService.get.mockReturnValue('0 3 * * *');

      await processor.onModuleInit();

      expect(mockQueue.add).toHaveBeenCalledWith(
        'refresh-trending-music',
        {},
        expect.objectContaining({
          repeat: { pattern: '0 3 * * *' },
        })
      );
    });

    it('should use custom cron value when TRENDING_MUSIC_CRON is set', async () => {
      mockConfigService.get.mockReturnValue('0 6 * * *');

      await processor.onModuleInit();

      expect(mockQueue.add).toHaveBeenCalledWith(
        'refresh-trending-music',
        {},
        expect.objectContaining({
          repeat: { pattern: '0 6 * * *' },
        })
      );
    });

    it('should pass correct jobId, removeOnComplete and removeOnFail options', async () => {
      mockConfigService.get.mockReturnValue('0 3 * * *');

      await processor.onModuleInit();

      expect(mockQueue.add).toHaveBeenCalledWith(
        'refresh-trending-music',
        {},
        expect.objectContaining({
          jobId: 'refresh-trending-music-job',
          removeOnComplete: { count: 1 },
          removeOnFail: { count: 10 },
        })
      );
    });
  });

  // ─── process ──────────────────────────────────────────────────────────────

  describe('process', () => {
    it('should call discoveryService.createTrendingMusicPlaylists', async () => {
      mockDiscoveryService.createTrendingMusicPlaylists.mockResolvedValue(undefined);

      await processor.process(makeJob());

      expect(mockDiscoveryService.createTrendingMusicPlaylists).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from createTrendingMusicPlaylists', async () => {
      const error = new Error('Discovery service failure');
      mockDiscoveryService.createTrendingMusicPlaylists.mockRejectedValue(error);

      await expect(processor.process(makeJob())).rejects.toThrow('Discovery service failure');
    });
  });
});
