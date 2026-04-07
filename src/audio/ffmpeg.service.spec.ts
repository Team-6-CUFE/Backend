import * as fs from 'node:fs';

import ffmpeg from 'fluent-ffmpeg';
import { FfmpegService } from './ffmpeg.service';

jest.mock('fluent-ffmpeg', () => {
  const mockFfmpegInstance = {
    audioCodec: jest.fn().mockReturnThis(),
    audioBitrate: jest.fn().mockReturnThis(),
    audioChannels: jest.fn().mockReturnThis(),
    audioFrequency: jest.fn().mockReturnThis(),
    format: jest.fn().mockReturnThis(),
    setStartTime: jest.fn().mockReturnThis(),
    setDuration: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    save: jest.fn().mockReturnThis(),
  };

  const mockConstructor: any = jest.fn(() => mockFfmpegInstance);

  mockConstructor.setFfmpegPath = jest.fn();
  mockConstructor.setFfprobePath = jest.fn();
  mockConstructor.ffprobe = jest.fn();

  return mockConstructor;
});

jest.mock('@ffmpeg-installer/ffmpeg', () => ({ path: '/mock/ffmpeg' }));
jest.mock('@ffprobe-installer/ffprobe', () => ({ path: '/mock/ffprobe' }));
jest.mock('node:fs');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockFfmpegConstructor = ffmpeg as unknown as jest.MockedFunction<any>;
const mockFfmpegInstance = mockFfmpegConstructor();
const mockFfprobe = mockFfmpegConstructor.ffprobe as jest.Mock;

describe('FfmpegService', () => {
  let service: FfmpegService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFfmpegInstance.on.mockImplementation(
      (event: string, handler: (...args: unknown[]) => void) => {
        if (event === 'end') {
          setImmediate(() => handler());
        }
        return mockFfmpegInstance;
      }
    );

    service = new FfmpegService();
  });

  // ─── constructor ─────────────────────────────────────────────

  describe('constructor', () => {
    it('should set ffmpeg and ffprobe paths on construction', () => {
      expect(mockFfmpegConstructor.setFfmpegPath).toHaveBeenCalledWith('/mock/ffmpeg');
      expect(mockFfmpegConstructor.setFfprobePath).toHaveBeenCalledWith('/mock/ffprobe');
    });
  });

  // ─── getDuration ─────────────────────────────────────────────

  describe('getDuration', () => {
    it('should return floored duration from ffprobe metadata', async () => {
      mockFfprobe.mockImplementation((_path: string, cb: (err: unknown, data?: any) => void) =>
        cb(null, { format: { duration: 213.7 } })
      );

      const duration = await service.getDuration('/mock/file.mp3');

      expect(duration).toBe(213);
    });

    it('should reject when ffprobe returns an error', async () => {
      mockFfprobe.mockImplementation((_path: string, cb: (err: unknown, data?: any) => void) =>
        cb(new Error('ffprobe failed'), null)
      );

      await expect(service.getDuration('/mock/file.mp3')).rejects.toThrow('ffprobe failed');
    });

    it('should call ffprobe with the correct file path', async () => {
      mockFfprobe.mockImplementation((_path: string, cb: (err: unknown, data?: any) => void) =>
        cb(null, { format: { duration: 100 } })
      );

      await service.getDuration('/audio/my-track.mp3');

      expect(mockFfprobe).toHaveBeenCalledWith('/audio/my-track.mp3', expect.any(Function));
    });
  });

  // ─── extractPreview ───────────────────────────────────────────

  describe('extractPreview', () => {
    it('should create preview at the given start time', async () => {
      const result = await service.extractPreview('/audio/track_standard.mp3', '00:01:30');

      expect(result).toBe('/audio/track_standard.mp3_preview.mp3');
      expect(mockFfmpegInstance.setStartTime).toHaveBeenCalledWith('00:01:30');
      expect(mockFfmpegInstance.setDuration).toHaveBeenCalledWith(20);
    });

    it('should reject when ffmpeg emits error', async () => {
      mockFfmpegInstance.on.mockImplementation(
        (event: string, handler: (...args: unknown[]) => void) => {
          if (event === 'error') {
            setImmediate(() => handler(new Error('preview failed')));
          }
          return mockFfmpegInstance;
        }
      );

      await expect(service.extractPreview('/audio/track.mp3', '00:00:30')).rejects.toThrow(
        'preview failed'
      );
    });
  });

  // ─── processAudio ─────────────────────────────────────────────

  describe('processAudio', () => {
    beforeEach(() => {
      const mockBuffer = Buffer.alloc(4000);
      const view = new DataView(mockBuffer.buffer);

      for (let i = 0; i < 2000; i += 1) {
        view.setInt16(i * 2, i % 32767, true);
      }

      mockFs.readFileSync.mockReturnValue(mockBuffer as any);
      mockFs.unlinkSync.mockReturnValue(undefined);

      mockFfprobe.mockImplementation((_path: string, cb: (err: unknown, data?: any) => void) =>
        cb(null, { format: { duration: 213 } })
      );

      mockFfmpegInstance.on.mockImplementation(
        (event: string, handler: (...args: unknown[]) => void) => {
          if (event === 'end') {
            setImmediate(() => handler());
          }
          return mockFfmpegInstance;
        }
      );
    });

    it('should return hqPath, standardPath, previewPath, waveform, and duration', async () => {
      const result = await service.processAudio('/tmp/track.mp3', '00:00:30', jest.fn());

      expect(result).toMatchObject({
        hqPath: '/tmp/track.mp3_hq.mp3',
        standardPath: '/tmp/track.mp3_standard.mp3',
        previewPath: '/tmp/track.mp3_standard.mp3_preview.mp3',
        duration: 213,
      });

      expect(Array.isArray(result.waveform)).toBe(true);
      expect(result.waveform).toHaveLength(1000);
    });

    it('should call onProgress during processing', async () => {
      const onProgress = jest.fn();
      await service.processAudio('/tmp/track.mp3', '00:00:30', onProgress);
      expect(onProgress).toHaveBeenCalled();
    });

    it('should produce waveform values between 0 and 1', async () => {
      const result = await service.processAudio('/tmp/track.mp3', '00:00:30', jest.fn());

      result.waveform.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it('should reject when any transcode step emits an error', async () => {
      mockFfmpegInstance.on.mockImplementation(
        (event: string, handler: (...args: unknown[]) => void) => {
          if (event === 'error') {
            setImmediate(() => handler(new Error('transcode failed')));
          }
          return mockFfmpegInstance;
        }
      );

      await expect(service.processAudio('/tmp/track.mp3', '00:00:30', jest.fn())).rejects.toThrow(
        'transcode failed'
      );
    });
  });
});
