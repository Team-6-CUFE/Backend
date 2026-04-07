import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Job } from 'bullmq';
import { FansService } from '../services/fans.service';

@Processor('fansQueue')
export class FansJobProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(FansJobProcessor.name);

  constructor(
    @InjectQueue('fansQueue') private readonly fansQueue: Queue,
    private readonly fansService: FansService,
    private readonly configService: ConfigService
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    const topFansCron = this.configService.get<string>('FANS_TOP_CRON', '0 3 * * *');
    const firstFansCron = this.configService.get<string>('FANS_FIRST_CRON', '0 4 * * *');

    await this.fansQueue.add(
      'refresh-top-fans',
      {},
      {
        jobId: 'refresh-top-fans-job',
        repeat: { pattern: topFansCron },
        removeOnComplete: { count: 1 },
        removeOnFail: { count: 10 },
      }
    );
    await this.fansQueue.add(
      'snapshot-first-fans',
      {},
      {
        jobId: 'snapshot-first-fans-job',
        repeat: { pattern: firstFansCron },
        removeOnComplete: { count: 1 },
        removeOnFail: { count: 10 },
      }
    );
    this.logger.log(
      `Fans jobs registered — top fans: "${topFansCron}", first fans: "${firstFansCron}"`
    );
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'refresh-top-fans':
        this.logger.log('Running refresh-top-fans job');
        await this.fansService.refreshAllTopFans();
        break;
      case 'snapshot-first-fans':
        this.logger.log('Running snapshot-first-fans job');
        await this.fansService.snapshotAllPendingFirstFans();
        break;
      default:
        this.logger.warn(`Unknown fans job: ${job.name}`);
    }
  }
}
