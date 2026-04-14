import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FollowersRepository } from './followers.repository';
import { UserRepository } from '../user/user.repository';
import { ActivitiesService } from '../discovery/activities.service';
import { ActivityType } from '../discovery/entities/activity.entity';

@Injectable()
export class FollowersService {
  constructor(
    private readonly followersRepository: FollowersRepository,
    private readonly userRepository: UserRepository,
    private readonly activityService: ActivitiesService
  ) {}

  async getFollowing(userId: string, page: number, limit: number) {
    const { users, total } = await this.followersRepository.getFollowing(userId, page, limit);

    const enriched = await Promise.all(
      users.map(async (u) => {
        const isFollowingBack = await this.followersRepository.isFollowing(
          u.userId as string,
          userId
        );
        return {
          userId: u.userId,
          username: u.username,
          displayName: u.displayName ?? null,
          avatarUrl: u.avatarUrl ?? null,
          followersCount: u.followersCount ?? 0,
          isFollowingBack,
        };
      })
    );

    return {
      status: 'success',
      data: {
        following: enriched,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalCount: total,
          limit,
        },
      },
    };
  }

  async getFollowers(userId: string, page: number, limit: number) {
    const { users, total } = await this.followersRepository.getFollowers(userId, page, limit);

    const enriched = await Promise.all(
      users.map(async (u) => {
        const isFollowedBack = await this.followersRepository.isFollowing(
          userId,
          u.userId as string
        );
        return {
          userId: u.userId,
          username: u.username,
          displayName: u.displayName ?? null,
          avatarUrl: u.avatarUrl ?? null,
          followersCount: u.followersCount ?? 0,
          isFollowedBack,
        };
      })
    );

    return {
      status: 'success',
      data: {
        followers: enriched,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalCount: total,
          limit,
        },
      },
    };
  }

  async getFollowingCount(userId: string) {
    const target = await this.userRepository.findById(userId);

    return {
      status: 'success',
      data: {
        userId,
        followingsCount: target!.followingsCount,
      },
    };
  }

  async getFollowersCount(userId: string) {
    const target = await this.userRepository.findById(userId);

    return {
      status: 'success',
      data: {
        userId,
        followersCount: target!.followersCount,
      },
    };
  }

  async getFollowStatus(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('Cannot check follow status with yourself');
    }
    const result = await this.followersRepository.getFollowStatus(currentUserId, targetUserId);
    return {
      status: 'success',
      data: {
        followStatus: result.status,
        ...(result.since && { since: result.since }),
      },
    };
  }

  async unfollowUser(followerId: string, followedId: string) {
    if (followerId === followedId) {
      throw new BadRequestException('You cannot unfollow yourself');
    }
    const deleted = await this.followersRepository.deleteFollow(followerId, followedId);
    if (!deleted) {
      throw new NotFoundException('You are not following this user');
    }
    return {
      status: 'success',
      message: 'Successfully unfollowed user',
    };
  }

  async followUser(followerId: string, followedId: string) {
    if (followerId === followedId) {
      throw new BadRequestException('You cannot follow yourself');
    }
    const alreadyFollowing = await this.followersRepository.isFollowing(followerId, followedId);
    if (alreadyFollowing) {
      throw new ConflictException('You are already following this user');
    }
    const follow = await this.followersRepository.createFollow(followerId, followedId);
    await this.activityService.createActivity(
      ActivityType.USER_FOLLOW,
      followedId,
      followerId,
      followedId
    );
    return {
      status: 'success',
      data: {
        followerId: follow.follower,
        followedId: follow.followed,
        createdAt: follow.createdAt,
      },
    };
  }

  async blockUser(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('You cannot block yourself');
    }

    const alreadyBlocked = await this.followersRepository.isBlocking(currentUserId, targetUserId);

    if (alreadyBlocked) {
      throw new ConflictException('You have already blocked this user');
    }

    const block = await this.followersRepository.createBlockAndHandleFollows(
      currentUserId,
      targetUserId
    );

    return {
      status: 'success',
      data: {
        blockerId: block.blocker,
        blockedId: block.blocked,
        createdAt: block.createdAt,
      },
    };
  }

  async unblockUser(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('You cannot unblock yourself');
    }

    const deleted = await this.followersRepository.deleteBlock(currentUserId, targetUserId);

    if (!deleted) {
      throw new NotFoundException('You have not blocked this user');
    }

    return {
      status: 'success',
      message: 'User successfully unblocked',
    };
  }

  async getBlockedUsers(userId: string, page: number, limit: number) {
    const { users, total } = await this.followersRepository.getBlockedUsers(userId, page, limit);

    return {
      status: 'success',
      data: {
        blockedUsers: users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalCount: total,
          limit,
        },
      },
    };
  }

  async getBlockStatus(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('Cannot check block status with yourself');
    }

    const blocks = await this.followersRepository.getBlockRelationship(currentUserId, targetUserId);

    const amIBlocking = blocks.find((b) => b.blocker === currentUserId);
    const isBlockingMe = blocks.find((b) => b.blocker === targetUserId);

    let blockStatus = 'none';
    let since: Date | undefined;

    if (amIBlocking && isBlockingMe) {
      blockStatus = 'mutualBlock';
    } else if (amIBlocking) {
      blockStatus = 'blocking';
      since = amIBlocking.createdAt;
    } else if (isBlockingMe) {
      blockStatus = 'blockedBy';
      since = isBlockingMe.createdAt;
    }

    return {
      status: 'success',
      data: {
        blockStatus,
        ...(since && { since }),
      },
    };
  }

  async getMutualFollowers(
    currentUserId: string,
    targetUserId: string,
    page: number,
    limit: number
  ) {
    // Cannot check mutuals against yourself
    if (currentUserId === targetUserId) {
      throw new BadRequestException('Cannot view mutual followers with yourself');
    }

    const targetUser = await this.userRepository.findById(targetUserId);

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Deny access if there is any block relationship
    const blocks = await this.followersRepository.getBlockRelationship(currentUserId, targetUserId);
    if (blocks.length > 0) {
      throw new ForbiddenException('Action not allowed due to a block relationship');
    }

    // Fetch the mutuals
    const { users, total } = await this.followersRepository.getMutualFollowers(
      currentUserId,
      targetUserId,
      page,
      limit
    );

    return {
      status: 'success',
      data: {
        targetUserId,
        mutualFollowers: users.map((u) => ({
          userId: u.userId,
          username: u.username,
          displayName: u.displayName ?? null,
          avatarUrl: u.avatarUrl ?? null,
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalCount: total,
          limit,
        },
      },
    };
  }

  async getSuggestedUsers(currentUserId: string, page: number, limit: number, by?: string) {
    const { users, total } = await this.followersRepository.getSuggestedUsers(
      currentUserId,
      page,
      limit,
      by
    );

    return {
      status: 'success',
      data: {
        suggestedUsers: users.map((u) => ({
          userId: u.userId,
          username: u.username,
          displayName: u.displayName ?? null,
          avatarUrl: u.avatarUrl ?? null,
          followersCount: u.followersCount ?? 0,
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalCount: total,
          limit,
        },
      },
    };
  }

  async getFriends(userId: string, page: number, limit: number) {
    const { users, total } = await this.followersRepository.getFriends(userId, page, limit);

    return {
      status: 'success',
      data: {
        friends: users.map((u) => ({
          userId: u.userId,
          username: u.username,
          displayName: u.displayName ?? null,
          avatarUrl: u.avatarUrl ?? null,
          followersCount: u.followersCount ?? 0,
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalCount: total,
          limit,
        },
      },
    };
  }
}
