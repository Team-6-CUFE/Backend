import { ReleaseJobProcessor } from './release-job.processor';

const mockTrackRepository = () => ({
  releaseTrack: jest.fn().mockResolvedValue(undefined),
});

const makeJob = (trackId: string) => ({ data: { trackId } }) as any;

describe('ReleaseJobProcessor', () => {
  let processor: ReleaseJobProcessor;
  let trackRepository: ReturnType<typeof mockTrackRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    trackRepository = mockTrackRepository();
    processor = new ReleaseJobProcessor(trackRepository as any);
  });

  // ─── process ─────────────────────────────────────────────────────────────────

  describe('process', () => {
    it('should call trackRepository.releaseTrack with the trackId from job.data', async () => {
      const trackId = 'track-uuid-123';

      await processor.process(makeJob(trackId));

      expect(trackRepository.releaseTrack).toHaveBeenCalledTimes(1);
      expect(trackRepository.releaseTrack).toHaveBeenCalledWith(trackId);
    });

    it('should propagate errors thrown by releaseTrack', async () => {
      const error = new Error('Database connection lost');
      trackRepository.releaseTrack.mockRejectedValue(error);

      await expect(processor.process(makeJob('track-uuid-456'))).rejects.toThrow(
        'Database connection lost'
      );
    });
  });
});
