import { Body, Controller, Get, Ip, Param, Query } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { ApiGetFeed } from './discovery.swagger';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';

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

  @ApiGetFeed()
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
}
