import { Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlaylistService } from './playlist.service';
import {
  ApiRepostPlaylist,
  ApiUnrepostPlaylist,
  ApiGetPlaylistRepostCount,
  ApiGetPlaylistReposts,
} from './playlist.swagger';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';

@ApiTags('Playlist')
@Controller('playlist')
export class PlaylistController {
  constructor(private readonly playlistService: PlaylistService) {}

  @ApiRepostPlaylist()
  @Post(':playlistId/repost')
  repostPlaylist(@Param('playlistId') playlistId: string, @CurrentUser('sub') userId: string) {
    return this.playlistService.repostPlaylist(playlistId, userId);
  }

  @ApiUnrepostPlaylist()
  @Delete('/:playlistId/repost')
  removeRepost(@Param('playlistId') playlistId: string, @CurrentUser('sub') userId: string) {
    return this.playlistService.removeRepost(playlistId, userId);
  }

  @ApiGetPlaylistRepostCount()
  @Get(':playlistId/reposts/count')
  getRepostsCount(@Param('playlistId') playlistId: string) {
    return this.playlistService.getRepostsCount(playlistId);
  }

  @ApiGetPlaylistReposts()
  @Get(':playlistId/reposts')
  getPlaylistReposters(@Param('playlistId') playlistId: string) {
    console.log(playlistId);
    // return this.playlistService.getPlaylistResposters(playlistId);
  }
}
