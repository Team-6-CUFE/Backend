import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TrackService } from './track.service';
import { TrackController } from './track.controller';
import { TrackRepository } from './track.repository';
import { TrackRepost } from './entities/track-reposts.entity';
import { Track } from './entities/track.entity';
import { Tag } from './entities/tag.entity';
import { Genre } from '../genre/entities/genre.entity';
import { UserModule } from '../user/user.module';
import { FollowersModule } from '../followers/followers.module';
import { TrackLikes } from './entities/track-likes.entity';
import { TrackComment } from './entities/track-comments.entity';
import { TrackSseService } from './services/track-sse.service';
import { AudioQueueEventsListener } from './listeners/audio-queue-events.listener';
import { StorageService } from '../common/storage_service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Track, TrackRepost, TrackLikes, TrackComment, Genre, Tag]),
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
    UserModule,
    FollowersModule,
  ],
  controllers: [TrackController],
  providers: [
    TrackService,
    TrackRepository,
    TrackSseService,
    AudioQueueEventsListener,
    StorageService,
  ],
  exports: [TrackService, TrackRepository],
})
export class TrackModule {}
