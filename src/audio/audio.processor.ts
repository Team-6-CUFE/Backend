import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { FfmpegService } from './ffmpeg.service';
import { StorageService } from '../common/storage_service';
import { Track } from '../track/entities/track.entity';
import { TrackStatus } from '../track/enums/track-status.enum';

export interface AudioJobResult {
  audioUrl: string;
  audioUrlHq: string;
  previewAudioUrl: string;
  waveformUrl: string;
  durationSeconds: number;
}

export interface AudioJobData {
  trackId: string;
  filePath: string;
  originalName: string;
  previewStartTime: string;
}

export interface PreviewJobData {
  trackId: string;
  audioUrl: string;
  startTime: string;
  oldPreviewUrl?: string;
}

@Processor('audioQueue')
export class AudioProcessor extends WorkerHost {
  private readonly logger = new Logger(AudioProcessor.name);

  constructor(
    private readonly ffmpegService: FfmpegService,
    private readonly storageService: StorageService,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>
  ) {
    super();
  }

  async process(job: Job<AudioJobData | PreviewJobData>): Promise<AudioJobResult | undefined> {
    if (job.name === 'regeneratePreview') {
      await this.handlePreviewRegeneration(job as Job<PreviewJobData>);
      return undefined;
    }
    return this.handleAudioProcessing(job as Job<AudioJobData>);
  }

  private async handleAudioProcessing(job: Job<AudioJobData>): Promise<AudioJobResult> {
    const { trackId, filePath, originalName, previewStartTime } = job.data;
    this.logger.log(`Processing audio for track ${trackId}`);

    // Snapshot old S3 URLs before overwriting them
    const existing = await this.trackRepository.findOne({ where: { trackId } });
    const oldUrls = existing
      ? [
          existing.audioUrl,
          existing.audioUrlHq,
          existing.previewAudioUrl,
          existing.waveformUrl,
        ].filter(Boolean)
      : [];

    try {
      // Step 1 — transcode with ffmpeg
      await job.updateProgress(5);
      const { hqPath, standardPath, previewPath, waveform, duration } =
        await this.ffmpegService.processAudio(
          filePath,
          previewStartTime ?? '00:00:30',
          async (percent) => {
            await job.updateProgress(Math.floor(percent * 0.7));
          }
        );

      // Step 2 — upload all files to S3
      await job.updateProgress(70);
      this.logger.log(`Uploading processed files to S3 for track ${trackId}`);

      // Sanitize filename: replace spaces/special chars to avoid S3 URL-encoding issues
      const rawBase = path.basename(originalName, path.extname(originalName));
      const baseName = rawBase.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');

      const [hqUpload, standardUpload, previewUpload, waveformUpload] = await Promise.all([
        this.storageService.uploadFile({
          buffer: fs.readFileSync(hqPath),
          originalname: `tracks/${trackId}/${baseName}_hq.mp3`,
          mimetype: 'audio/mpeg',
        } as Express.Multer.File),

        this.storageService.uploadFile({
          buffer: fs.readFileSync(standardPath),
          originalname: `tracks/${trackId}/${baseName}_standard.mp3`,
          mimetype: 'audio/mpeg',
        } as Express.Multer.File),

        this.storageService.uploadFile({
          buffer: fs.readFileSync(previewPath),
          originalname: `tracks/${trackId}/${baseName}_preview.mp3`,
          mimetype: 'audio/mpeg',
        } as Express.Multer.File),

        // Upload waveform as JSON
        this.storageService.uploadFile({
          buffer: Buffer.from(JSON.stringify(waveform)),
          originalname: `tracks/${trackId}/waveform.json`,
          mimetype: 'application/json',
        } as Express.Multer.File),
      ]);

      await job.updateProgress(90);

      // Step 3 — update track record in DB
      const result: AudioJobResult = {
        audioUrlHq: hqUpload.Location,
        audioUrl: standardUpload.Location,
        previewAudioUrl: previewUpload.Location,
        waveformUrl: waveformUpload.Location,
        durationSeconds: duration,
      };

      await this.trackRepository.update(trackId, {
        ...result,
        trackStatus: TrackStatus.FINISHED,
      });

      // Delete old S3 files now that new ones are saved
      await Promise.allSettled(oldUrls.map((url) => this.storageService.deleteFile(url)));

      await job.updateProgress(100);
      this.logger.log(`Track ${trackId} processed successfully`);

      // Return value is serialized by BullMQ and forwarded to the QueueEvents 'completed' event
      return result;
    } catch (error) {
      this.logger.error(`Failed to process track ${trackId}:`, error);

      // Mark track as failed in DB
      await this.trackRepository.update(trackId, { trackStatus: TrackStatus.FAILED });
      throw error;
    } finally {
      this.cleanupTempFiles([
        filePath,
        `${filePath}_hq.mp3`,
        `${filePath}_standard.mp3`,
        `${filePath}_standard.mp3_preview.mp3`,
      ]);
    }
  }

  private async handlePreviewRegeneration(job: Job<PreviewJobData>): Promise<void> {
    const { trackId, audioUrl, startTime, oldPreviewUrl } = job.data;
    this.logger.log(`Regenerating preview for track ${trackId} at ${startTime}`);

    const tempAudioPath = path.join(os.tmpdir(), `preview_src_${trackId}_${Date.now()}.mp3`);

    try {
      await this.storageService.downloadToTemp(audioUrl, tempAudioPath);
      const previewPath = await this.ffmpegService.extractPreview(tempAudioPath, startTime);

      const uploaded = await this.storageService.uploadFile({
        buffer: fs.readFileSync(previewPath),
        originalname: `tracks/${trackId}/preview_${Date.now()}.mp3`,
        mimetype: 'audio/mpeg',
      } as Express.Multer.File);

      await this.trackRepository.update(trackId, { previewAudioUrl: uploaded.Location });

      if (oldPreviewUrl) await this.storageService.deleteFile(oldPreviewUrl);

      this.logger.log(`Preview regenerated for track ${trackId}`);
      this.cleanupTempFiles([tempAudioPath, previewPath]);
    } catch (error) {
      this.logger.error(`Failed to regenerate preview for track ${trackId}:`, error);
      this.cleanupTempFiles([tempAudioPath]);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job "${job.name}" ${job.id} completed for track ${job.data.trackId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job "${job.name}" ${job.id} failed for track ${job.data.trackId}: ${error.message}`
    );
  }

  private cleanupTempFiles(paths: string[]) {
    paths.forEach((p) => {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {
        this.logger.warn(`Could not delete temp file: ${p}`);
      }
    });
  }
}
