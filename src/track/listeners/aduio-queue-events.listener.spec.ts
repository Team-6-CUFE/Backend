import { AudioQueueEventsListener } from './audio-queue-events.listener';
import { mockTrackSseService } from '../tests/track.mock';

describe('AudioQueueEventsListener', () => {
  let listener: AudioQueueEventsListener;
  let sseService: ReturnType<typeof mockTrackSseService>;

  beforeEach(() => {
    sseService = mockTrackSseService();
    listener = new AudioQueueEventsListener(sseService as any);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── onProgress ───────────────────────────────────────────────────────────────

  describe('onProgress', () => {
    it('should emit progress event with numeric data', () => {
      listener.onProgress({ jobId: 'track-1', data: 45 });

      expect(sseService.emit).toHaveBeenCalledWith('track-1', {
        event: 'progress',
        data: { trackId: 'track-1', progress: 45 },
      });
    });

    it('should emit progress event with object data using count field', () => {
      listener.onProgress({ jobId: 'track-1', data: { count: 70 } });

      expect(sseService.emit).toHaveBeenCalledWith('track-1', {
        event: 'progress',
        data: { trackId: 'track-1', progress: 70 },
      });
    });

    it('should fall back to 0 when object data has no count field', () => {
      listener.onProgress({ jobId: 'track-1', data: {} });

      expect(sseService.emit).toHaveBeenCalledWith('track-1', {
        event: 'progress',
        data: { trackId: 'track-1', progress: 0 },
      });
    });

    it('should use jobId as trackId', () => {
      listener.onProgress({ jobId: 'my-track-uuid', data: 10 });

      expect(sseService.emit).toHaveBeenCalledWith(
        'my-track-uuid',
        expect.objectContaining({ data: expect.objectContaining({ trackId: 'my-track-uuid' }) })
      );
    });

    it('should handle progress = 0', () => {
      listener.onProgress({ jobId: 'track-1', data: 0 });

      expect(sseService.emit).toHaveBeenCalledWith('track-1', {
        event: 'progress',
        data: { trackId: 'track-1', progress: 0 },
      });
    });

    it('should handle progress = 100', () => {
      listener.onProgress({ jobId: 'track-1', data: 100 });

      expect(sseService.emit).toHaveBeenCalledWith('track-1', {
        event: 'progress',
        data: { trackId: 'track-1', progress: 100 },
      });
    });
  });

  // ─── onCompleted ──────────────────────────────────────────────────────────────

  describe('onCompleted', () => {
    const mockResult = {
      audioUrl: 'https://s3.amazonaws.com/audio/track.mp3',
      audioUrlHq: 'https://s3.amazonaws.com/audio/track_hq.mp3',
      previewAudioUrl: 'https://s3.amazonaws.com/previews/track.mp3',
      waveformUrl: 'https://s3.amazonaws.com/waveforms/track.json',
      durationSeconds: 213,
    };

    it('should emit completed event and call complete when returnvalue is object', () => {
      listener.onCompleted({ jobId: 'track-1', returnvalue: mockResult });

      expect(sseService.emit).toHaveBeenCalledWith('track-1', {
        event: 'completed',
        data: { trackId: 'track-1', ...mockResult },
      });
      expect(sseService.complete).toHaveBeenCalledWith('track-1');
    });

    it('should parse JSON string returnvalue', () => {
      listener.onCompleted({ jobId: 'track-1', returnvalue: JSON.stringify(mockResult) });

      expect(sseService.emit).toHaveBeenCalledWith('track-1', {
        event: 'completed',
        data: { trackId: 'track-1', ...mockResult },
      });
    });

    it('should call complete after emit', () => {
      const order: string[] = [];
      sseService.emit.mockImplementation(() => order.push('emit'));
      sseService.complete.mockImplementation(() => order.push('complete'));

      listener.onCompleted({ jobId: 'track-1', returnvalue: {} });

      expect(order).toEqual(['emit', 'complete']);
    });

    it('should handle empty returnvalue object', () => {
      listener.onCompleted({ jobId: 'track-1', returnvalue: {} });

      expect(sseService.emit).toHaveBeenCalledWith('track-1', {
        event: 'completed',
        data: { trackId: 'track-1' },
      });
    });

    it('should handle null-ish returnvalue gracefully', () => {
      listener.onCompleted({ jobId: 'track-1', returnvalue: '{}' });

      expect(sseService.emit).toHaveBeenCalled();
      expect(sseService.complete).toHaveBeenCalledWith('track-1');
    });
  });

  // ─── onFailed ─────────────────────────────────────────────────────────────────

  describe('onFailed', () => {
    it('should emit failed event with error message', () => {
      listener.onFailed({ jobId: 'track-1', failedReason: 'ffmpeg crashed' });

      expect(sseService.emit).toHaveBeenCalledWith('track-1', {
        event: 'failed',
        data: { trackId: 'track-1', error: 'ffmpeg crashed' },
      });
    });

    it('should call complete after emitting failed event', () => {
      listener.onFailed({ jobId: 'track-1', failedReason: 'out of disk' });

      expect(sseService.complete).toHaveBeenCalledWith('track-1');
    });

    it('should call complete after emit in correct order', () => {
      const order: string[] = [];
      sseService.emit.mockImplementation(() => order.push('emit'));
      sseService.complete.mockImplementation(() => order.push('complete'));

      listener.onFailed({ jobId: 'track-1', failedReason: 'error' });

      expect(order).toEqual(['emit', 'complete']);
    });

    it('should use jobId as both the emit target and trackId in data', () => {
      listener.onFailed({ jobId: 'my-uuid', failedReason: 'timeout' });

      expect(sseService.emit).toHaveBeenCalledWith(
        'my-uuid',
        expect.objectContaining({ data: expect.objectContaining({ trackId: 'my-uuid' }) })
      );
      expect(sseService.complete).toHaveBeenCalledWith('my-uuid');
    });

    it('should handle empty failedReason string', () => {
      listener.onFailed({ jobId: 'track-1', failedReason: '' });

      expect(sseService.emit).toHaveBeenCalledWith('track-1', {
        event: 'failed',
        data: { trackId: 'track-1', error: '' },
      });
    });
  });
});
