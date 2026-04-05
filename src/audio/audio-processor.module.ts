import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AudioProcessor } from './audio.processor';
import { FfmpegModule } from './ffmpeg.module';
import { Track } from '../track/entities/track.entity';
import { StorageService } from '../common/storage_service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Track]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = new URL(configService.getOrThrow<string>('REDIS_URL'));
        return {
          connection: {
            host: redisUrl.hostname,
            port: Number(redisUrl.port) || 6379,
            password: redisUrl.password || undefined,
            username: redisUrl.username || undefined,
            tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: 'audioQueue' }),
    FfmpegModule,
  ],
  providers: [AudioProcessor, StorageService],
})
export class AudioProcessorModule {}
