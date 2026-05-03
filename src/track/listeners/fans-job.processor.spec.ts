import { Queue, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { FansService } from '../services/fans.service';
import { FansJobProcessor } from './fans-job.processor';

const mockFansQueue = () => ({
  add: jest.fn().mockResolvedValue(undefined),
});

const mockFansService = () => ({
  refreshAllTopFans: jest.fn().mockResolvedValue(undefined),
  snapshotAllPendingFirstFans: jest.fn().mockResolvedValue(undefined),
});

const mockConfigService = () => ({
  get: jest.fn(),
});

const makeJob = (name: string) => ({ name, data: {} }) as unknown as Job;

describe('FansJobProcessor', () => {
  let processor: FansJobProcessor;
  let fansQueue: ReturnType<typeof mockFansQueue>;
  let fansService: ReturnType<typeof mockFansService>;
  let configService: ReturnType<typeof mockConfigService>;

  beforeEach(() => {
    jest.clearAllMocks();
    fansQueue = mockFansQueue();
    fansService = mockFansService();
    configService = mockConfigService();
    processor = new FansJobProcessor(
      fansQueue as unknown as Queue,
      fansService as unknown as FansService,
      configService as unknown as ConfigService
    );
  });

  // ─── onModuleInit ────────────────────────────────────────────────────────────

  describe('onModuleInit', () => {
    it('should register refresh-top-fans with default cron when config returns default', async () => {
      configService.get.mockImplementation((_key: string, defaultValue: string) => defaultValue);

      await processor.onModuleInit();

      expect(fansQueue.add).toHaveBeenCalledWith(
        'refresh-top-fans',
        {},
        expect.objectContaining({
          jobId: 'refresh-top-fans-job',
          repeat: { pattern: '0 3 * * *' },
        })
      );
    });

    it('should register snapshot-first-fans with default cron when config returns default', async () => {
      configService.get.mockImplementation((_key: string, defaultValue: string) => defaultValue);

      await processor.onModuleInit();

      expect(fansQueue.add).toHaveBeenCalledWith(
        'snapshot-first-fans',
        {},
        expect.objectContaining({
          jobId: 'snapshot-first-fans-job',
          repeat: { pattern: '0 4 * * *' },
        })
      );
    });

    it('should use custom cron values when config returns them', async () => {
      configService.get.mockImplementation((key: string, _default: string) => {
        if (key === 'FANS_TOP_CRON') return '0 1 * * *';
        if (key === 'FANS_FIRST_CRON') return '0 2 * * *';
        return _default;
      });

      await processor.onModuleInit();

      expect(fansQueue.add).toHaveBeenCalledWith(
        'refresh-top-fans',
        {},
        expect.objectContaining({ repeat: { pattern: '0 1 * * *' } })
      );
      expect(fansQueue.add).toHaveBeenCalledWith(
        'snapshot-first-fans',
        {},
        expect.objectContaining({ repeat: { pattern: '0 2 * * *' } })
      );
    });

    it('should set removeOnComplete and removeOnFail options for both jobs', async () => {
      configService.get.mockImplementation((_key: string, defaultValue: string) => defaultValue);

      await processor.onModuleInit();

      fansQueue.add.mock.calls.forEach((call) => {
        expect(call[2]).toMatchObject({
          removeOnComplete: { count: 1 },
          removeOnFail: { count: 10 },
        });
      });
    });
  });

  // ─── process ─────────────────────────────────────────────────────────────────

  describe('process', () => {
    it('should call fansService.refreshAllTopFans for refresh-top-fans job', async () => {
      await processor.process(makeJob('refresh-top-fans'));

      expect(fansService.refreshAllTopFans).toHaveBeenCalledTimes(1);
      expect(fansService.snapshotAllPendingFirstFans).not.toHaveBeenCalled();
    });

    it('should call fansService.snapshotAllPendingFirstFans for snapshot-first-fans job', async () => {
      await processor.process(makeJob('snapshot-first-fans'));

      expect(fansService.snapshotAllPendingFirstFans).toHaveBeenCalledTimes(1);
      expect(fansService.refreshAllTopFans).not.toHaveBeenCalled();
    });

    it('should not throw for an unknown job name', async () => {
      await expect(processor.process(makeJob('unknown-job'))).resolves.toBeUndefined();
    });

    it('should not call any fansService method for an unknown job name', async () => {
      await processor.process(makeJob('unknown-job'));

      expect(fansService.refreshAllTopFans).not.toHaveBeenCalled();
      expect(fansService.snapshotAllPendingFirstFans).not.toHaveBeenCalled();
    });
  });
});
