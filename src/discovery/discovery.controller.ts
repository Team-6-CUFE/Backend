import { Body, Controller, Get, Ip, Query, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';
import { ApiGetFeed, ApiGetTrackStation } from './discovery.swagger';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';

@ApiTags('Discovery')
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @ApiGetFeed()
  @Get('feed/following')
  async getFeed(
    @CurrentUser('sub') userId: string,
    @Body('includeReposts') includeReposts: boolean,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    return this.discoveryService.getFeed(userId, includeReposts, page, limit);
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
}
