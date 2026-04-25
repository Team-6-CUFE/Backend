import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DiscoveryService } from './discovery.service';
import { DiscoveryController } from './discovery.controller';
import { ActivityService } from '../activity/activity.service';
import { Activity } from '../activity/entities/activity.entity';
import { FollowersModule } from '../followers/followers.module';
import { ActivityModule } from '../activity/activity.module';
import { PlaylistModule } from '../playlist/playlist.module';
import { TrackModule } from '../track/track.module';
import { UserModule } from '../user/user.module';
import { GenreModule } from '../genre/genre.module';
import { TrendingMusicProcessor } from './listeners/trending-music.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Activity]),
    FollowersModule,
    ActivityModule,
    PlaylistModule,
    TrackModule,
    UserModule,
    GenreModule,
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
    BullModule.registerQueue({ name: 'trendingMusicQueue' }),
  ],
  controllers: [DiscoveryController],
  providers: [DiscoveryService, ActivityService, TrendingMusicProcessor],
  exports: [DiscoveryService, ActivityService],
})
export class DiscoveryModule {}
