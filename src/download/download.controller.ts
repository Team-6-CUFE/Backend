import { Controller, Delete, Get, Ip, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DownloadService } from './download.service';
import { Plans } from '../authentication/decorators/plans.decorator';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';

@ApiTags('Download')
@Controller('download')
export class DownloadController {
  constructor(private readonly downloadService: DownloadService) {}

  @Plans('pro', 'go+')
  @Post('track/:track_id')
  async downloadTrack(
    @Param('track_id') trackId: string,
    @CurrentUser('sub') userId: string,
    @Ip() ip: string
  ) {
    return this.downloadService.downloadTrack(trackId, userId, ip);
  }

  @Plans('pro', 'go+')
  @Delete('track/:track_id')
  async deleteDownloadedTrack(
    @Param('track_id') trackId: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.downloadService.deleteDownloadedTrack(trackId, userId);
  }

  @Plans('pro', 'go+')
  @Post('playlist/:playlist_id')
  async downloadPlaylist(
    @Param('playlist_id') playlistId: string,
    @CurrentUser('sub') userId: string,
    @Ip() ip: string
  ) {
    return this.downloadService.downloadPlaylist(playlistId, userId, ip);
  }

  @Plans('pro', 'go+')
  @Delete('playlist/:playlist_id')
  async deleteDownloadedPlaylist(
    @Param('playlist_id') playlistId: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.downloadService.deleteDownloadedPlaylist(playlistId, userId);
  }

  @Plans('pro', 'go+')
  @Get('/list')
  async getDownloadedList(
    @CurrentUser('sub') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    return this.downloadService.getDownloadedList(userId, page, limit);
  }
}
