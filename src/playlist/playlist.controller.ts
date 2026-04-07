import { Controller, Delete, Get, Param, Post, ParseUUIDPipe, Query, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlaylistService } from './playlist.service';
import {
  ApiRepostPlaylist,
  ApiUnrepostPlaylist,
  ApiGetPlaylistRepostCount,
  ApiGetPlaylistReposts,
  ApiGetUserPlaylistReposts,
  ApiGetPlaylistLikes,
  ApiGetPlaylistLikesCount,
  ApiGetUserPlaylistLikes,
  ApiLikePlaylist,
  ApiUnlikePlaylist,
  ApiCreatePlaylist,
} from './playlist.swagger';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';
import { CheckBlock } from '../followers/decorators/no-block.decorator';
import { CreatePlaylistDto } from './dto/create-playlist.dto';

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

  /// likes
  @ApiLikePlaylist()
  @Post(':playlistId/like')
  likePlaylist(
    @Param('playlistId', ParseUUIDPipe) playlistId: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.playlistService.likePlaylist(playlistId, userId);
  }

  @ApiUnlikePlaylist()
  @Delete('/:playlistId/like')
  unlikePlaylist(
    @Param('playlistId', ParseUUIDPipe) playlistId: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.playlistService.unlikePlaylist(playlistId, userId);
  }

  @ApiGetPlaylistLikesCount()
  @Get(':playlistId/likes/count')
  getLikesCount(
    @Param('playlistId', ParseUUIDPipe) playlistId: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.playlistService.getLikesCount(playlistId, userId);
  }

  @ApiGetPlaylistLikes()
  @Get(':playlistId/likes')
  getPlaylistLikes(
    @Param('playlistId', ParseUUIDPipe) playlistId: string,
    @CurrentUser('sub') userId: string,
    @Query('page') page: number,
    @Query('limit') limit: number
  ) {
    return this.playlistService.getPlaylistLikes(playlistId, userId, page, limit);
  }

  @ApiGetUserPlaylistLikes()
  @CheckBlock()
  @Get('users/:user_id/likes')
  getUserTrackLikes(
    @Param('user_id', ParseUUIDPipe) userId: string,
    @CurrentUser('sub') myUserId: string,
    @Query('page') page: number,
    @Query('limit') limit: number
  ) {
    return this.playlistService.getUserPlaylistLikes(userId, myUserId, page, limit);
  }

  @ApiCreatePlaylist()
  @Post('create-playlist')
  createPlaylist(@Body() createPlaylistDto: CreatePlaylistDto, @CurrentUser('sub') userId: string) {
    return this.playlistService.createPlaylist(createPlaylistDto, userId);
  }
}
