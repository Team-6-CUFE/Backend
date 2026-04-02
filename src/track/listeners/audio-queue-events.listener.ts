import { Logger } from '@nestjs/common';
import { OnQueueEvent, QueueEventsHost, QueueEventsListener } from '@nestjs/bullmq';
import { TrackSseService } from '../services/track-sse.service';

@QueueEventsListener('audioQueue')
export class AudioQueueEventsListener extends QueueEventsHost {
  private readonly logger = new Logger(AudioQueueEventsListener.name);

  constructor(private readonly trackSseService: TrackSseService) {
    super();
  }

  /** jobId === trackId */
  @OnQueueEvent('progress')
  onProgress({ jobId, data }: { jobId: string; data: number | object }): void {
    const progress = typeof data === 'number' ? data : ((data as { count: number }).count ?? 0);
    this.trackSseService.emit(jobId, {
      event: 'progress',
      data: { trackId: jobId, progress },
    });
  }

  @OnQueueEvent('completed')
  onCompleted({ jobId, returnvalue }: { jobId: string; returnvalue: string }): void {
    this.logger.log(`Audio job completed for track ${jobId}`);
    this.trackSseService.emit(jobId, {
      event: 'completed',
      data: { trackId: jobId, ...(returnvalue ? JSON.parse(returnvalue) : {}) },
    });
    this.trackSseService.complete(jobId);
  }

  @OnQueueEvent('failed')
  onFailed({ jobId, failedReason }: { jobId: string; failedReason: string }): void {
    this.logger.error(`Audio job failed for track ${jobId}: ${failedReason}`);
    this.trackSseService.emit(jobId, {
      event: 'failed',
      data: { trackId: jobId, error: failedReason },
    });
    this.trackSseService.complete(jobId);
  }
}
