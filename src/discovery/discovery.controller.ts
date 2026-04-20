import { Body, Controller, Get, Ip, Query, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';
import {
  ApiGetFeed,
  ApiGetTrackStation,
  ApiGetUserRecentActivities,
  ApiGetArtistStation,
} from './discovery.swagger';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';

@ApiTags('Discovery')
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @ApiGetFeed()
  @Get('feed/following')
  async getFeed(
    @CurrentUser('sub') userId: string,
    @Ip() ip: string,
    @Body('includeReposts') includeReposts: boolean,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    return this.discoveryService.getFeed(userId, ip, includeReposts, page, limit);
  }

  @ApiGetUserRecentActivities()
  @Get('/profile/:username/recent-activities')
  getUserRecentActivities(
    @CurrentUser('sub') userId: string,
    @Ip() ip: string,
    @Param('username') username: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    return this.discoveryService.getUserRecentActivities(userId, username, ip, page, limit);
  }

  @ApiGetTrackStation()
  @Get('track-station/:artist_username/:track_name')
  async getTrackStation(
    @CurrentUser('sub') userId: string,
    @Param('artist_username') artistUsername: string,
    @Param('track_name') trackName: string,
    @Ip() ip: string
  ) {
    return this.discoveryService.getTrackStation(artistUsername, trackName, userId, ip);
  }

  @ApiGetArtistStation()
  @Get('artist-station/:username')
  async getArtistStation(
    @CurrentUser('sub') userId: string,
    @Param('username') username: string,
    @Ip() ip: string
  ) {
    return this.discoveryService.getArtistStation(username, userId, ip);
  }

  @ApiGetTrackStation()
  @Get('/profile/:username/popular-tracks')
  async getUserPopularTracks(
    @CurrentUser('sub') userId: string,
    @Param('username') username: string,
    @Ip() ip: string
  ) {
    return this.discoveryService.getUserPopularTracks(username, userId, ip);
  }

  @ApiGetTrackStation()
  @Get('/more-of-what-you-like')
  async getMoreOfWhatYouLike(@CurrentUser('sub') userId: string, @Ip() ip: string) {
    return this.discoveryService.getMoreOfWhatYouLike(userId, ip);
  }
}
