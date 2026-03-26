import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { UserService } from './user.service';
// import { CheckBlock } from "../followers/decorators/no-block.decorator";
import { CurrentUser } from '../authentication/decorators/current-user.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // @CheckBlock()
  @Get(':user_id/tracks/reposts')
  getUserTrackReposts(
    @Param('user_id', ParseUUIDPipe) userId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @CurrentUser('sub') myUserId: string
  ) {
    return this.userService.getUserTrackReposts(userId, myUserId, page, limit);
  }
}
