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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { Roles } from '../authentication/decorators/roles.decorator';
import { ApiGetAllUsers, ApiSuspendUser, ApiReactivateUser } from './admin.swagger';

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
    @Query('search') search?: string
  ) {
    const safeLimit = Math.min(limit, 50);

    const result = await this.adminService.getUsers(safeLimit, offset, search);

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

  // @ApiGetTopTracks()
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
}
