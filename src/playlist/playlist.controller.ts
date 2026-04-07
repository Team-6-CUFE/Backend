import {
  Controller,
  Delete,
  Get,
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
    // Service remains the same, we just pass addTrackDto.trackId
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

  @Get(':playlistId')
  // @ApiGetPlaylistDetails()
  async getPlaylist(
    @Param('playlistId', ParseUUIDPipe) playlistId: string,
    @Query('s') secretToken: string,
    @CurrentUser('sub') userId: string | null // Make sure your decorator handles null for guests
  ) {
    return this.playlistService.getPlaylist(playlistId, userId, secretToken);
  }
}
