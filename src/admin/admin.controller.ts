import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  Patch,
  Param,
  ParseUUIDPipe,
  Body,
  Delete,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { Roles } from '../authentication/decorators/roles.decorator';
import {
  ApiGetAllUsers,
  ApiSuspendUser,
  ApiReactivateUser,
  ApiGetTopTracks,
  ApiGetPlatformStats,
  ApiGetEngagementAnalytics,
  ApiGetAllTracksWithReportCount,
  ApiHideTrack,
  ApiDeleteTrack,
} from './admin.swagger';
import { TrackStatus } from '../track/enums/track-status.enum';
import { Role, UserStatus } from './report-enums';

@Roles('admin')
@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiGetAllUsers()
  @Get('users')
  async getUsers(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('search') search?: string,
    @Query('role') role?: Role,
    @Query('status') status?: UserStatus
  ) {
    const safeLimit = Math.min(limit, 50);

    const result = await this.adminService.getUsers(safeLimit, offset, search, role, status);

    return {
      status: 'success',
      data: {
        users: result.users,
        pagination: {
          limit: safeLimit,
          offset,
          total: result.total,
          hasMore: offset + safeLimit < result.total,
        },
      },
    };
  }

  @Patch('users/:user_id/suspend')
  @ApiSuspendUser()
  async suspendUser(
    @Param('user_id', ParseUUIDPipe) userId: string,
    @Body() suspendUserDto: SuspendUserDto
  ) {
    await this.adminService.suspendUser(userId, suspendUserDto.reason);

    return {
      status: 'success',
      message: 'User suspended successfully',
    };
  }

  @Patch('users/:user_id/reactivate')
  @ApiReactivateUser()
  async reactivateUser(@Param('user_id', ParseUUIDPipe) userId: string) {
    await this.adminService.reactivateUser(userId);

    return {
      status: 'success',
      message: 'User reactivated successfully',
    };
  }

  @ApiGetTopTracks()
  @Get('tracks/top')
  async getTopTracks() {
    const tracks = await this.adminService.getTopTracks();

    return {
      status: 'success',
      data: {
        tracks,
      },
    };
  }

  @ApiGetPlatformStats()
  @Get('stats')
  async getPlatformStats() {
    const stats = await this.adminService.getPlatformStats();

    return {
      status: 'success',
      data: stats,
    };
  }

  @ApiGetEngagementAnalytics()
  @Get('engagement')
  async getEngagementAnalytics() {
    const analytics = await this.adminService.getEngagementAnalytics();

    return {
      status: 'success',
      data: {
        timeline: analytics,
      },
    };
  }

  @ApiGetAllTracksWithReportCount()
  @Get('tracks')
  getAllTracksWithReportCount(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: TrackStatus
  ) {
    return this.adminService.getAllTracksWithReportCount(page, limit, status);
  }

  @ApiHideTrack()
  @Patch('tracks/:track_id/hide')
  async hideTrack(
    @Param('track_id', ParseUUIDPipe) trackId: string,
    @Body('hidden') hidden: boolean
  ) {
    await this.adminService.toggleTrackVisibility(trackId, hidden);

    return {
      status: 'success',
      message: `Track ${hidden ? 'hidden' : 'shown'} successfully`,
    };
  }

  @ApiDeleteTrack()
  @Delete('tracks/:track_id')
  async deleteTrack(@Param('track_id', ParseUUIDPipe) trackId: string) {
    await this.adminService.adminDeleteTrack(trackId);

    return {
      status: 'success',
      message: 'Track deleted successfully',
    };
  }
}
