import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackService } from './track.service';
import { TrackController } from './track.controller';
import { TrackRepository } from './track.repository';
import { TrackRepost } from './entities/track-reposts.entity';
import { Track } from './entities/track.entity';
import { UserModule } from '../user/user.module';
import { FollowersModule } from '../followers/followers.module';
import { TrackLikes } from './entities/track-likes.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Track, TrackRepost, TrackLikes]),
    UserModule,
    FollowersModule,
  ],
  controllers: [TrackController],
  providers: [TrackService, TrackRepository],
  exports: [TrackService, TrackRepository],
})
export class TrackModule {}
