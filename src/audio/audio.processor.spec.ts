import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as fs from 'node:fs';
import { AudioProcessor } from './audio.processor';
import { FfmpegService } from './ffmpeg.service';
import { StorageService } from '../common/storage_service';
import { Track } from '../track/entities/track.entity';
import { TrackStatus } from '../track/enums/track-status.enum';
import { mockStorageService } from '../track/tests/track.mock';

jest.mock('node:fs');
jest.mock('node:path', () => ({
  ...jest.requireActual('node:path'),
  join: jest.fn((...args: string[]) => args.join('/')),
  basename: jest.fn((p: string, ext?: string) => {
    const base = p.split('/').pop() || '';
    return ext ? base.replace(ext, '') : base;
  }),
  extname: jest.fn((p: string) => {
    const parts = p.split('.');
    return parts.length > 1 ? `.${parts.pop()}` : '';
  }),
}));

const mockFs = fs as jest.Mocked<typeof fs>;

const MOCK_TRACK_ID = '123e4567-e89b-12d3-a456-426614174000';

const mockFfmpegService = () => ({
  processAudio: jest.fn(),
  extractPreview: jest.fn(),
});

const mockTrackRepository = () => ({
  findOne: jest.fn(),
  update: jest.fn(),
});

const mockAudioJobData = (overrides?: object) => ({
  trackId: MOCK_TRACK_ID,
  filePath: '/tmp/track.mp3',
  originalName: 'my track.mp3',
  previewStartTime: '00:00:30',
  ...overrides,
});

const mockPreviewJobData = (overrides?: object) => ({
  trackId: MOCK_TRACK_ID,
  audioUrl: 'https://s3.amazonaws.com/audio/track.mp3',
  startTime: '00:01:00',
  oldPreviewUrl: 'https://s3.amazonaws.com/previews/old.mp3',
  ...overrides,
});

const mockJob = (name: string, data: object) => ({
  name,
  data,
  id: 'job-1',
  updateProgress: jest.fn().mockResolvedValue(undefined),
});

const mockProcessResult = {
  hqPath: '/tmp/track.mp3_hq.mp3',
  standardPath: '/tmp/track.mp3_standard.mp3',
  previewPath: '/tmp/track.mp3_standard.mp3_preview.mp3',
  waveform: [0.1, 0.5, 0.9],
  duration: 213,
};

const mockUploadResult = (suffix: string) => ({
  Location: `https://s3.amazonaws.com/tracks/${MOCK_TRACK_ID}/${suffix}`,
});

describe('AudioProcessor', () => {
  let processor: AudioProcessor;
  let ffmpegService: ReturnType<typeof mockFfmpegService>;
  let storageService: ReturnType<typeof mockStorageService>;
  let trackRepository: ReturnType<typeof mockTrackRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudioProcessor,
        { provide: FfmpegService, useFactory: mockFfmpegService },
        { provide: StorageService, useFactory: mockStorageService },
        { provide: getRepositoryToken(Track), useFactory: mockTrackRepository },
      ],
    }).compile();

    processor = module.get(AudioProcessor);
    ffmpegService = module.get(FfmpegService);
    storageService = module.get(StorageService);
    trackRepository = module.get(getRepositoryToken(Track));

    mockFs.readFileSync.mockReturnValue(Buffer.from('mock audio data') as any);
    mockFs.existsSync.mockReturnValue(true);
    mockFs.unlinkSync.mockReturnValue(undefined);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── process (routing) ────────────────────────────────────────────────────────

  describe('process', () => {
    it('should route regeneratePreview jobs to handlePreviewRegeneration', async () => {
      const job = mockJob('regeneratePreview', mockPreviewJobData());
      storageService.downloadToTemp.mockResolvedValue(undefined);
      ffmpegService.extractPreview.mockResolvedValue('/tmp/preview.mp3');
      storageService.uploadFile.mockResolvedValue(mockUploadResult('preview.mp3'));
      trackRepository.update.mockResolvedValue(undefined);

      const result = await processor.process(job as any);

      expect(result).toBeUndefined();
    });

    it('should route processAudio jobs to handleAudioProcessing', async () => {
      const job = mockJob('processAudio', mockAudioJobData());
      trackRepository.findOne.mockResolvedValue(null);
      ffmpegService.processAudio.mockResolvedValue(mockProcessResult);
      storageService.uploadFile
        .mockResolvedValueOnce(mockUploadResult('track_hq.mp3'))
        .mockResolvedValueOnce(mockUploadResult('track_standard.mp3'))
        .mockResolvedValueOnce(mockUploadResult('track_preview.mp3'))
        .mockResolvedValueOnce(mockUploadResult('waveform.json'));
      trackRepository.update.mockResolvedValue(undefined);

      const result = await processor.process(job as any);

      expect(result).toBeDefined();
      expect(result).toMatchObject({ durationSeconds: 213 });
    });
  });

  // ─── handleAudioProcessing ────────────────────────────────────────────────────

  describe('handleAudioProcessing', () => {
    const setupSuccessfulJob = () => {
      const job = mockJob('processAudio', mockAudioJobData());
      trackRepository.findOne.mockResolvedValue(null);
      ffmpegService.processAudio.mockResolvedValue(mockProcessResult);
      storageService.uploadFile
        .mockResolvedValueOnce(mockUploadResult('track_hq.mp3'))
        .mockResolvedValueOnce(mockUploadResult('track_standard.mp3'))
        .mockResolvedValueOnce(mockUploadResult('track_preview.mp3'))
        .mockResolvedValueOnce(mockUploadResult('waveform.json'));
      trackRepository.update.mockResolvedValue(undefined);
      return job;
    };

    it('should return AudioJobResult with correct S3 URLs', async () => {
      const job = setupSuccessfulJob();

      const result = await processor.process(job as any);

      expect(result).toMatchObject({
        audioUrlHq: `https://s3.amazonaws.com/tracks/${MOCK_TRACK_ID}/track_hq.mp3`,
        audioUrl: `https://s3.amazonaws.com/tracks/${MOCK_TRACK_ID}/track_standard.mp3`,
        previewAudioUrl: `https://s3.amazonaws.com/tracks/${MOCK_TRACK_ID}/track_preview.mp3`,
        waveformUrl: `https://s3.amazonaws.com/tracks/${MOCK_TRACK_ID}/waveform.json`,
        durationSeconds: 213,
      });
    });

    it('should update track status to FINISHED on success', async () => {
      const job = setupSuccessfulJob();

      await processor.process(job as any);

      expect(trackRepository.update).toHaveBeenCalledWith(
        MOCK_TRACK_ID,
        expect.objectContaining({ trackStatus: TrackStatus.FINISHED })
      );
    });

    it('should call updateProgress with 5 at start', async () => {
      const job = setupSuccessfulJob();

      await processor.process(job as any);

      expect(job.updateProgress).toHaveBeenCalledWith(5);
    });

    it('should call updateProgress with 100 at end', async () => {
      const job = setupSuccessfulJob();

      await processor.process(job as any);

      expect(job.updateProgress).toHaveBeenCalledWith(100);
    });

    it('should delete old S3 files when existing track has URLs', async () => {
      const job = mockJob('processAudio', mockAudioJobData());
      trackRepository.findOne.mockResolvedValue({
        audioUrl: 'https://s3.amazonaws.com/old-audio.mp3',
        audioUrlHq: 'https://s3.amazonaws.com/old-hq.mp3',
        previewAudioUrl: 'https://s3.amazonaws.com/old-preview.mp3',
        waveformUrl: 'https://s3.amazonaws.com/old-waveform.json',
      });
      ffmpegService.processAudio.mockResolvedValue(mockProcessResult);
      storageService.uploadFile
        .mockResolvedValueOnce(mockUploadResult('track_hq.mp3'))
        .mockResolvedValueOnce(mockUploadResult('track_standard.mp3'))
        .mockResolvedValueOnce(mockUploadResult('track_preview.mp3'))
        .mockResolvedValueOnce(mockUploadResult('waveform.json'));
      trackRepository.update.mockResolvedValue(undefined);

      await processor.process(job as any);

      expect(storageService.deleteFile).toHaveBeenCalledWith(
        'https://s3.amazonaws.com/old-audio.mp3'
      );
      expect(storageService.deleteFile).toHaveBeenCalledWith('https://s3.amazonaws.com/old-hq.mp3');
    });

    it('should NOT call deleteFile when no existing track', async () => {
      const job = mockJob('processAudio', mockAudioJobData());
      trackRepository.findOne.mockResolvedValue(null);
      ffmpegService.processAudio.mockResolvedValue(mockProcessResult);
      storageService.uploadFile
        .mockResolvedValueOnce(mockUploadResult('hq.mp3'))
        .mockResolvedValueOnce(mockUploadResult('standard.mp3'))
        .mockResolvedValueOnce(mockUploadResult('preview.mp3'))
        .mockResolvedValueOnce(mockUploadResult('waveform.json'));
      trackRepository.update.mockResolvedValue(undefined);

      await processor.process(job as any);

      expect(storageService.deleteFile).not.toHaveBeenCalled();
    });

    it('should update track status to FAILED and rethrow on ffmpeg error', async () => {
      const job = mockJob('processAudio', mockAudioJobData());
      trackRepository.findOne.mockResolvedValue(null);
      ffmpegService.processAudio.mockRejectedValue(new Error('ffmpeg crashed'));
      trackRepository.update.mockResolvedValue(undefined);

      await expect(processor.process(job as any)).rejects.toThrow('ffmpeg crashed');
      expect(trackRepository.update).toHaveBeenCalledWith(MOCK_TRACK_ID, {
        trackStatus: TrackStatus.FAILED,
      });
    });

    it('should clean up temp files even when processing fails', async () => {
      const job = mockJob('processAudio', mockAudioJobData());
      trackRepository.findOne.mockResolvedValue(null);
      ffmpegService.processAudio.mockRejectedValue(new Error('error'));
      trackRepository.update.mockResolvedValue(undefined);

      await expect(processor.process(job as any)).rejects.toThrow();
      expect(mockFs.unlinkSync).toHaveBeenCalled();
    });

    it('should sanitize filename with spaces for S3 upload', async () => {
      const job = mockJob('processAudio', mockAudioJobData({ originalName: 'my track name.mp3' }));
      trackRepository.findOne.mockResolvedValue(null);
      ffmpegService.processAudio.mockResolvedValue(mockProcessResult);
      storageService.uploadFile.mockResolvedValue(mockUploadResult('file.mp3'));
      trackRepository.update.mockResolvedValue(undefined);

      await processor.process(job as any);

      const uploadCalls = storageService.uploadFile.mock.calls;
      uploadCalls.forEach((call) => {
        const { originalname } = call[0];
        expect(originalname).not.toContain(' ');
      });
    });

    it('should upload 4 files to S3 (hq, standard, preview, waveform)', async () => {
      const job = setupSuccessfulJob();

      await processor.process(job as any);

      expect(storageService.uploadFile).toHaveBeenCalledTimes(4);
    });
  });

  // ─── handlePreviewRegeneration ────────────────────────────────────────────────

  describe('handlePreviewRegeneration', () => {
    it('should download audio, extract preview, upload, and update DB', async () => {
      const job = mockJob('regeneratePreview', mockPreviewJobData());
      storageService.downloadToTemp.mockResolvedValue(undefined);
      ffmpegService.extractPreview.mockResolvedValue('/tmp/preview.mp3');
      storageService.uploadFile.mockResolvedValue(mockUploadResult('new-preview.mp3'));
      trackRepository.update.mockResolvedValue(undefined);

      await processor.process(job as any);

      expect(storageService.downloadToTemp).toHaveBeenCalledWith(
        'https://s3.amazonaws.com/audio/track.mp3',
        expect.any(String)
      );
      expect(ffmpegService.extractPreview).toHaveBeenCalledWith(expect.any(String), '00:01:00');
      expect(trackRepository.update).toHaveBeenCalledWith(
        MOCK_TRACK_ID,
        expect.objectContaining({ previewAudioUrl: expect.any(String) })
      );
    });

    it('should delete old preview URL after uploading new one', async () => {
      const job = mockJob('regeneratePreview', mockPreviewJobData());
      storageService.downloadToTemp.mockResolvedValue(undefined);
      ffmpegService.extractPreview.mockResolvedValue('/tmp/preview.mp3');
      storageService.uploadFile.mockResolvedValue(mockUploadResult('new-preview.mp3'));
      trackRepository.update.mockResolvedValue(undefined);

      await processor.process(job as any);

      expect(storageService.deleteFile).toHaveBeenCalledWith(
        'https://s3.amazonaws.com/previews/old.mp3'
      );
    });

    it('should NOT delete old preview when oldPreviewUrl is not provided', async () => {
      const job = mockJob('regeneratePreview', mockPreviewJobData({ oldPreviewUrl: undefined }));
      storageService.downloadToTemp.mockResolvedValue(undefined);
      ffmpegService.extractPreview.mockResolvedValue('/tmp/preview.mp3');
      storageService.uploadFile.mockResolvedValue(mockUploadResult('new-preview.mp3'));
      trackRepository.update.mockResolvedValue(undefined);

      await processor.process(job as any);

      expect(storageService.deleteFile).not.toHaveBeenCalled();
    });

    it('should clean up temp files on error', async () => {
      const job = mockJob('regeneratePreview', mockPreviewJobData());
      storageService.downloadToTemp.mockResolvedValue(undefined);
      ffmpegService.extractPreview.mockRejectedValue(new Error('preview failed'));

      await expect(processor.process(job as any)).rejects.toThrow('preview failed');
      expect(mockFs.unlinkSync).toHaveBeenCalled();
    });

    it('should rethrow error after cleanup', async () => {
      const job = mockJob('regeneratePreview', mockPreviewJobData());
      storageService.downloadToTemp.mockRejectedValue(new Error('download failed'));

      await expect(processor.process(job as any)).rejects.toThrow('download failed');
    });
  });

  // ─── event handlers ───────────────────────────────────────────────────────────

  describe('onCompleted', () => {
    it('should not throw', () => {
      expect(() =>
        processor.onCompleted({
          name: 'processAudio',
          id: 'job-1',
          data: { trackId: MOCK_TRACK_ID },
        } as any)
      ).not.toThrow();
    });
  });

  describe('onFailed', () => {
    it('should not throw', () => {
      expect(() =>
        processor.onFailed(
          { name: 'processAudio', id: 'job-1', data: { trackId: MOCK_TRACK_ID } } as any,
          new Error('test error')
        )
      ).not.toThrow();
    });
  });
});
