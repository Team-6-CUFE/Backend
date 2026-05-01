import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TrackRepository } from '../track.repository';

@Processor('releaseQueue')
export class ReleaseJobProcessor extends WorkerHost {
  private readonly logger = new Logger(ReleaseJobProcessor.name);

  constructor(private readonly trackRepository: TrackRepository) {
    super();
  }

  async process(job: Job<{ trackId: string }>): Promise<void> {
    const { trackId } = job.data;
    this.logger.log(`Releasing scheduled track ${trackId}`);
    await this.trackRepository.releaseTrack(trackId);
    this.logger.log(`Track ${trackId} is now live`);
  }
}
