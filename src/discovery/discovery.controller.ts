import { Body, Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';
import { ApiGetFeed } from './discovery.swagger';
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

  @Get('track-station/:artist_username/:track_name')
  async getTrackStation(
    @Param('artist_username') artistUsername: string,
    @Param('track_name') trackName: string
  ) {
    return this.discoveryService.getTrackStation(artistUsername, trackName);
  }
}
