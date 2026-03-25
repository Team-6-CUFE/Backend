import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackService } from './track.service';
import { TrackController } from './track.controller';
import { TrackRepository } from './track.repository';
import { TrackRepost } from './entities/track-reposts.entity';
import { UserModule } from '../user/user.module';
import { Track } from './entities/track.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Track, TrackRepost]), UserModule],
  controllers: [TrackController],
  providers: [TrackService, TrackRepository],
})
export class TrackModule {}
