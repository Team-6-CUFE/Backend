import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaylistService } from './playlist.service';
import { PlaylistController } from './playlist.controller';
import { Playlist } from './entities/playlist.entity';
import { PlaylistRepost } from './entities/playlist-reposts.entity';
import { PlaylistLike } from './entities/playlist-likes.entity';
import { PlaylistRepository } from './playlist.repository';
import { UserModule } from '../user/user.module';
import { FollowersModule } from '../followers/followers.module';
import { StorageService } from '../common/storage_service';
import { PlaylistTrack } from './entities/playlist-tracks.entity';
import { Track } from '../track/entities/track.entity';
import { Tag } from '../track/entities/tag.entity';
import { GenreModule } from '../genre/genre.module';
import { Genre } from '../genre/entities/genre.entity';
import { DiscoveryModule } from '../discovery/discovery.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Playlist,
      PlaylistRepost,
      PlaylistLike,
      PlaylistTrack,
      Track,
      Tag,
      Genre,
    ]),
    UserModule,
    FollowersModule,
    GenreModule,
    DiscoveryModule,
  ],
  controllers: [PlaylistController],
  providers: [PlaylistService, PlaylistRepository, StorageService],
  exports: [PlaylistService, PlaylistRepository],
})
export class PlaylistModule {}
