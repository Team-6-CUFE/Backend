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

@Module({
  imports: [
    TypeOrmModule.forFeature([Playlist, PlaylistRepost, PlaylistLike, PlaylistTrack, Track]),
    UserModule,
    FollowersModule,
  ],
  controllers: [PlaylistController],
  providers: [PlaylistService, PlaylistRepository, StorageService],
})
export class PlaylistModule {}
