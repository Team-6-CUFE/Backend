import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Job } from 'bullmq';
import { DiscoveryService } from '../discovery.service';

@Processor('trendingMusicQueue')
export class TrendingMusicProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(TrendingMusicProcessor.name);

  constructor(
    @InjectQueue('trendingMusicQueue') private readonly trendingMusicQueue: Queue,
    private readonly configService: ConfigService,
    private readonly discoveryService: DiscoveryService
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    const trendingCron = this.configService.get<string>('TRENDING_MUSIC_CRON', '0 3 * * *');

    await this.trendingMusicQueue.add(
      'refresh-trending-music',
      {},
      {
        jobId: 'refresh-trending-music-job',
        repeat: { pattern: trendingCron },
        removeOnComplete: { count: 1 },
        removeOnFail: { count: 10 },
      }
    );

    this.logger.log(`Trending music job registered — cron: "${trendingCron}"`);
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id}...`);
    this.logger.log('Running refresh-trending-music job');
    await this.discoveryService.createTrendingMusicPlaylists();
  }
}
