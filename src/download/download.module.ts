import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DownloadService } from './download.service';
import { DownloadController } from './download.controller';
import { DownloadedTrack } from './entities/downloaded-tracks.entity';
import { DownloadedPlaylist } from './entities/downloaded-playlists.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DownloadedTrack, DownloadedPlaylist])],
  controllers: [DownloadController],
  providers: [DownloadService],
  exports: [DownloadService],
})
export class DownloadModule {}
