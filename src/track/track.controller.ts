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
import { TrackService } from './track.service';
import {
  ApiEditTrackRepost,
  ApiGetTrackReposts,
  ApiGetTrackRepostsCount,
  ApiRemoveTrackRepost,
  ApiRepostTrack,
} from './track.swagger';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';

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

  // @ApiGetTrackReposts()
  // @Get(':track-id/reposts')
  // getTrackReposts(@Param('track-id') trackId: string) {
  //   return this.trackService.getTrackReposts(trackId);
  // }

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
}
