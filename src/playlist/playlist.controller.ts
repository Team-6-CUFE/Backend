import {
  Controller,
  Delete,
  Get,
  Ip,
  Param,
  Post,
  ParseUUIDPipe,
  Query,
  Body,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseFilePipe,
  UploadedFile,
  UseInterceptors,
  Patch,
  Put,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
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
  ApiAddTrackToPlaylist,
  ApiUpdatePlaylist,
  ApiRemoveTrackFromPlaylist,
  ApiDeletePlaylist,
  ApiGetUserCreatedPlaylists,
  ApiReorderTracks,
  ApiGetPublicPlaylist,
  ApiGetSecretPlaylist,
  ApiResetPlaylistSecretToken,
  ApiGetMyPlaylists,
  ApiGetUserPlaylists,
} from './playlist.swagger';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';
import { CheckBlock } from '../followers/decorators/no-block.decorator';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { AddTrackDto } from './dto/add-track.dto';

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

  @ApiUpdatePlaylist()
  @UseInterceptors(FileInterceptor('coverImage'))
  @Patch(':playlistId')
  async updatePlaylist(
    @CurrentUser('sub') userId: string,
    @Param('playlistId') playlistId: string,
    @Body() updatePlaylistDto: UpdatePlaylistDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB limit
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
      })
    )
    file?: Express.Multer.File
  ) {
    return this.playlistService.updatePlaylist(userId, playlistId, updatePlaylistDto, file);
  }

  @ApiAddTrackToPlaylist()
  @Post(':playlistId/tracks') // Removed :trackId from path
  async addTrackToPlaylist(
    @Param('playlistId', ParseUUIDPipe) playlistId: string,
    @Body() addTrackDto: AddTrackDto, // Now coming from Body
    @CurrentUser('sub') userId: string
  ) {
    return this.playlistService.addTrackToPlaylist(playlistId, addTrackDto.trackId, userId);
  }

  @ApiRemoveTrackFromPlaylist()
  @Delete(':playlistId/tracks/:trackId')
  async removeTrack(
    @Param('playlistId', ParseUUIDPipe) playlistId: string,
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.playlistService.removeTrackFromPlaylist(playlistId, trackId, userId);
  }

  @ApiDeletePlaylist()
  @Delete(':playlistId')
  async deletePlaylist(
    @Param('playlistId', ParseUUIDPipe) playlistId: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.playlistService.deletePlaylist(playlistId, userId);
  }

  @ApiGetUserCreatedPlaylists()
  @Get(':playlistId/create')
  async getPlaylist(
    @Param('playlistId', ParseUUIDPipe) playlistId: string,
    @Query('s') secretToken: string,
    @CurrentUser('sub') userId: string | null
  ) {
    return this.playlistService.getPlaylist(playlistId, userId, secretToken);
  }

  @Put(':playlistId/tracks/reorder')
  @ApiReorderTracks()
  async bulkReorder(
    @Param('playlistId', ParseUUIDPipe) playlistId: string,
    @Body('trackIds') trackIds: string[],
    @CurrentUser('sub') userId: string
  ) {
    if (!Array.isArray(trackIds) || trackIds.length === 0) {
      throw new BadRequestException('trackIds must be a non-empty array of track IDs');
    }
    return this.playlistService.reorder(playlistId, trackIds, userId);
  }

  // @ApiChangePlaylistPrivacy()
  // @Patch('/:playlistId/privacy')
  // changePlaylistPrivacy(
  //   @Param('playlistId') playlistId: string,
  //   @Body('isPublic') isPublic: boolean,
  //   @CurrentUser('sub') userId: string
  // ) {
  //   return this.playlistService.changePlaylistPrivacy(playlistId, isPublic, userId);
  // }

  @ApiGetPublicPlaylist()
  @Get('/:playlistId')
  async getPublicPlaylist(
    @Param('playlistId', ParseUUIDPipe) playlistId: string,
    @CurrentUser('sub') userId: string,
    @Ip() ip: string
  ) {
    return this.playlistService.getPublicPlaylist(playlistId, userId, ip);
  }

  @ApiGetSecretPlaylist()
  @Get('/secret/:secretToken')
  getSecretPlaylist(@Param('secretToken') secretToken: string, @Ip() ip: string) {
    return this.playlistService.getSecretPlaylist(secretToken, ip);
  }

  @ApiResetPlaylistSecretToken()
  @Post('/:playlistId/reset-token')
  resetSecretToken(@Param('playlistId') playlistId: string, @CurrentUser('sub') userId: string) {
    return this.playlistService.resetSecretToken(playlistId, userId);
  }

  @ApiGetMyPlaylists()
  @Get('me')
  async getMyPlaylists(
    @CurrentUser('sub') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    return this.playlistService.getMyPlaylists(userId, page, limit);
  }

  @ApiGetUserPlaylists()
  @CheckBlock()
  @Get('users/:user_id/playlists')
  getUserPlaylists(
    @Param('user_id', ParseUUIDPipe) userId: string,
    @CurrentUser('sub') myUserId: string | null,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    return this.playlistService.getUserPlaylists(userId, myUserId, page, limit);
  }
}
