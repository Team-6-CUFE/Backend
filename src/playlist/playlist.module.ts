import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaylistService } from './playlist.service';
import { PlaylistController } from './playlist.controller';
import { Playlist } from './entities/playlist.entity';
import { PlaylistRepost } from './entities/playlist-reposts.entity';
import { PlaylistRepository } from './playlist.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Playlist, PlaylistRepost])],
  controllers: [PlaylistController],
  providers: [PlaylistService, PlaylistRepository],
})
export class PlaylistModule {}
