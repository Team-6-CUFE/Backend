import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { FfmpegService } from './ffmpeg.service';
import { StorageService } from '../common/storage_service';
import { Track } from '../track/entities/track.entity';
import { TrackStatus } from '../track/enums/track-status.enum';

export interface AudioJobData {
  trackId: string;
  filePath: string;
  originalName: string;
  previewStartTime: string;
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

  async process(job: Job<AudioJobData>): Promise<void> {
    const { trackId, filePath, originalName, previewStartTime } = job.data;

    this.logger.log(`Processing audio job for track ${trackId}`);

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

      const baseName = path.basename(originalName, path.extname(originalName));

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
      await this.trackRepository.update(trackId, {
        audioUrl: hqUpload.Location,
        audioUrlHq: standardUpload.Location,
        previewAudioUrl: previewUpload.Location,
        waveformUrl: waveformUpload.Location,
        durationSeconds: duration,
        trackStatus: TrackStatus.FINISHED,
      });

      await job.updateProgress(100);
      this.logger.log(`Track ${trackId} processed successfully`);
    } catch (error) {
      this.logger.error(`Failed to process track ${trackId}:`, error);

      // Mark track as failed in DB
      await this.trackRepository.update(trackId, {
        trackStatus: TrackStatus.FAILED,
      });

      throw error; // rethrow so BullMQ marks the job as failed
    } finally {
      // Cleanup temp files regardless of success or failure
      this.cleanupTempFiles([
        filePath,
        `${filePath}_hq.mp3`,
        `${filePath}_standard.mp3`,
        `${filePath}_standard.mp3_preview.mp3`,
      ]);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed for track ${job.data.track_id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed for track ${job.data.track_id}: ${error.message}`);
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
