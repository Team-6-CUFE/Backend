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

@Module({
  imports: [
    TypeOrmModule.forFeature([Playlist, PlaylistRepost, PlaylistLike]),
    UserModule,
    FollowersModule,
  ],
  controllers: [PlaylistController],
  providers: [PlaylistService, PlaylistRepository],
  exports: [PlaylistService, PlaylistRepository],
})
export class PlaylistModule {}
