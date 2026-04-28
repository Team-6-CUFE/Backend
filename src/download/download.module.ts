import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DownloadService } from './download.service';
import { DownloadController } from './download.controller';
import { DownloadedTrack } from './entities/downloaded-tracks.entity';
import { DownloadedPlaylist } from './entities/downloaded-playlists.entity';
import { TrackModule } from '../track/track.module';
import { DownloadRepository } from './download.repository';

@Module({
  imports: [TypeOrmModule.forFeature([DownloadedTrack, DownloadedPlaylist]), TrackModule],
  controllers: [DownloadController],
  providers: [DownloadService, DownloadRepository],
  exports: [DownloadService],
})
export class DownloadModule {}
