import { Body, Controller, Get, Ip, Query } from '@nestjs/common';
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
}
