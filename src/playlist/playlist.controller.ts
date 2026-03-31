import { Controller, Delete, Get, Param, Post, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlaylistService } from './playlist.service';
import {
  ApiRepostPlaylist,
  ApiUnrepostPlaylist,
  ApiGetPlaylistRepostCount,
  ApiGetPlaylistReposts,
  ApiGetUserPlaylistReposts,
} from './playlist.swagger';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';
import { CheckBlock } from '../followers/decorators/no-block.decorator';

@ApiTags('Playlist')
@Controller('playlist')
export class PlaylistController {
  constructor(private readonly playlistService: PlaylistService) {}

  @ApiRepostPlaylist()
  @Post(':playlistId/repost')
  repostPlaylist(
    @Param('playlistId', ParseUUIDPipe) playlistId: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.playlistService.repostPlaylist(playlistId, userId);
  }

  @ApiUnrepostPlaylist()
  @Delete('/:playlistId/repost')
  removeRepost(
    @Param('playlistId', ParseUUIDPipe) playlistId: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.playlistService.removeRepost(playlistId, userId);
  }

  @ApiGetPlaylistRepostCount()
  @Get(':playlistId/reposts/count')
  getRepostsCount(@Param('playlistId', ParseUUIDPipe) playlistId: string) {
    return this.playlistService.getRepostsCount(playlistId);
  }

  @ApiGetPlaylistReposts()
  @Get(':playlistId/reposts')
  getPlaylistReposters(
    @Param('playlistId', ParseUUIDPipe) playlistId: string,
    @CurrentUser('sub') userId: string,
    @Query('page') page: number,
    @Query('limit') limit: number
  ) {
    return this.playlistService.getPlaylistReposters(playlistId, userId, page, limit);
  }

  @ApiGetUserPlaylistReposts()
  @CheckBlock()
  @Get('users/:user_id/reposts')
  getUserTrackReposts(
    @Param('user_id', ParseUUIDPipe) userId: string,
    @CurrentUser('sub') myUserId: string,
    @Query('page') page: number,
    @Query('limit') limit: number
  ) {
    return this.playlistService.getUserPlaylistReposts(userId, myUserId, page, limit);
  }
}
