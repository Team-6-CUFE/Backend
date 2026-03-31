import {
  Controller,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Get,
  Delete,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TrackService } from './track.service';
import {
  ApiEditTrackRepost,
  ApiGetTrackReposts,
  ApiGetTrackRepostsCount,
  ApiGetUserTrackReposts,
  ApiLikeTrack,
  ApiRemoveTrackRepost,
  ApiRepostTrack,
} from './track.swagger';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';
import { CheckBlock } from '../followers/decorators/no-block.decorator';

@ApiTags('Tracks')
@Controller('tracks')
export class TrackController {
  constructor(private readonly trackService: TrackService) {}

  @ApiRepostTrack()
  @Post(':trackId/repost')
  repostTrack(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser('sub') userId: string,
    @Body('caption') caption: string
  ) {
    return this.trackService.repostTrack(trackId, userId, caption);
  }

  @ApiGetTrackRepostsCount()
  @Get(':trackId/reposts/count')
  getTrackRepostsCount(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.trackService.getTrackRepostsCount(trackId, userId);
  }

  @ApiRemoveTrackRepost()
  @Delete(':trackId/repost')
  removeTrackRepost(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.trackService.removeTrackRepost(trackId, userId);
  }

  @ApiEditTrackRepost()
  @Patch(':trackId/repost')
  editTrackRepost(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser('sub') userId: string,
    @Body('caption') caption: string
  ) {
    return this.trackService.editTrackRepost(trackId, userId, caption);
  }

  @ApiGetTrackReposts()
  @Get(':trackId/reposts')
  getTrackReposts(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser('sub') userId: string,
    @Query('page') page: number,
    @Query('limit') limit: number
  ) {
    return this.trackService.getTrackReposts(trackId, userId, page, limit);
  }

  @ApiGetUserTrackReposts()
  @CheckBlock()
  @Get('users/:user_id/reposts')
  getUserTrackReposts(
    @Param('user_id', ParseUUIDPipe) userId: string,
    @CurrentUser('sub') myUserId: string,
    @Query('page') page: number,
    @Query('limit') limit: number
  ) {
    return this.trackService.getUserTrackReposts(userId, myUserId, page, limit);
  }

  @ApiLikeTrack()
  @Post(':trackId/like')
  likeTrack(@Param('trackId', ParseUUIDPipe) trackId: string, @CurrentUser('sub') userId: string) {
    return this.trackService.likeTrack(trackId, userId);
  }
}
