import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FollowersService } from './followers.service';
import { CheckUserExists } from './decorators/user-exists.decorator';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';
import {
  ApiFollowUser,
  ApiUnfollowUser,
  ApiGetFollowStatus,
  ApiGetFollowers,
  ApiGetFollowing,
  ApiGetFollowersCount,
  ApiGetFollowingCount,
  ApiBlockUser,
  ApiUnblockUser,
  ApiGetBlockedUsers,
  ApiGetBlockStatus,
  ApiGetMutualFollowers,
  ApiGetSuggestedUsers,
  ApiGetFriends,
} from './followers.swagger';
import { CheckBlock } from './decorators/no-block.decorator';

@ApiTags('Followers & Social Graph')
@Controller('users')
export class FollowersController {
  constructor(private readonly followersService: FollowersService) {}

  @Get('blocked')
  @ApiGetBlockedUsers()
  async getBlockedUsers(
    @CurrentUser('sub') currentUserId: string,
    @Query('page') page: number,
    @Query('limit') limit: number
  ) {
    return this.followersService.getBlockedUsers(currentUserId, page ?? 1, limit ?? 20);
  }

  @Post(':user_id/follow')
  @HttpCode(HttpStatus.CREATED)
  @CheckBlock()
  @CheckUserExists('user_id')
  @ApiFollowUser()
  async followUser(
    @CurrentUser('sub') followerId: string,
    @Param('user_id', ParseUUIDPipe) followedId: string
  ) {
    return this.followersService.followUser(followerId, followedId);
  }

  @Delete(':user_id/follow')
  @HttpCode(HttpStatus.OK)
  @CheckUserExists('user_id')
  @ApiUnfollowUser()
  async unfollowUser(
    @CurrentUser('sub') followerId: string,
    @Param('user_id', ParseUUIDPipe) followedId: string
  ) {
    return this.followersService.unfollowUser(followerId, followedId);
  }

  @Get(':user_id/follow-status')
  @CheckBlock()
  @CheckUserExists('user_id')
  @ApiGetFollowStatus()
  async getFollowStatus(
    @CurrentUser('sub') currentUserId: string,
    @Param('user_id', ParseUUIDPipe) targetUserId: string
  ) {
    return this.followersService.getFollowStatus(currentUserId, targetUserId);
  }

  @Get(':user_id/followers/count')
  @CheckBlock()
  @CheckUserExists()
  @ApiGetFollowersCount()
  async getFollowersCount(@Param('user_id', ParseUUIDPipe) userId: string) {
    return this.followersService.getFollowersCount(userId);
  }

  @Get(':user_id/following/count')
  @CheckBlock()
  @CheckUserExists()
  @ApiGetFollowingCount()
  async getFollowingCount(@Param('user_id', ParseUUIDPipe) userId: string) {
    return this.followersService.getFollowingCount(userId);
  }

  @Get(':user_id/followers')
  @CheckBlock()
  @CheckUserExists()
  @ApiGetFollowers()
  async getFollowers(
    @Param('user_id', ParseUUIDPipe) userId: string,
    @Query('page') page: number,
    @Query('limit') limit: number
  ) {
    return this.followersService.getFollowers(userId, page ?? 1, limit ?? 20);
  }

  @Get(':user_id/following')
  @CheckBlock()
  @CheckUserExists()
  @ApiGetFollowing()
  async getFollowing(
    @Param('user_id', ParseUUIDPipe) userId: string,
    @Query('page') page: number,
    @Query('limit') limit: number
  ) {
    return this.followersService.getFollowing(userId, page ?? 1, limit ?? 20);
  }

  @Post(':user_id/block')
  @CheckUserExists('user_id')
  @ApiBlockUser()
  async blockUser(
    @CurrentUser('sub') currentUserId: string,
    @Param('user_id', ParseUUIDPipe) targetUserId: string
  ) {
    return this.followersService.blockUser(currentUserId, targetUserId);
  }

  @Delete(':user_id/block')
  @CheckUserExists('user_id')
  @ApiUnblockUser()
  async unblockUser(
    @CurrentUser('sub') currentUserId: string,
    @Param('user_id', ParseUUIDPipe) targetUserId: string
  ) {
    return this.followersService.unblockUser(currentUserId, targetUserId);
  }

  @Get(':user_id/block-status')
  @CheckUserExists('user_id')
  @ApiGetBlockStatus()
  async getBlockStatus(
    @CurrentUser('sub') currentUserId: string,
    @Param('user_id', ParseUUIDPipe) targetUserId: string
  ) {
    return this.followersService.getBlockStatus(currentUserId, targetUserId);
  }

  @Get(':user_id/mutual-followers')
  @CheckUserExists('user_id')
  @ApiGetMutualFollowers()
  async getMutualFollowers(
    @CurrentUser('sub') currentUserId: string,
    @Param('user_id', ParseUUIDPipe) targetUserId: string,
    @Query('page') page: number,
    @Query('limit') limit: number
  ) {
    return this.followersService.getMutualFollowers(
      currentUserId,
      targetUserId,
      page ?? 1,
      limit ?? 20
    );
  }

  @Get('suggested')
  @ApiGetSuggestedUsers()
  async getSuggestedUsers(
    @CurrentUser('sub') currentUserId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('by') by?: string
  ) {
    return this.followersService.getSuggestedUsers(currentUserId, page ?? 1, limit ?? 20, by);
  }

  @Get(':user_id/friends')
  @CheckBlock()
  @CheckUserExists()
  @ApiGetFriends()
  async getFriends(
    @Param('user_id', ParseUUIDPipe) userId: string,
    @Query('page') page: number,
    @Query('limit') limit: number
  ) {
    return this.followersService.getFriends(userId, page ?? 1, limit ?? 20);
  }
}
