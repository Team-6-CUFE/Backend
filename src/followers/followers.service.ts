import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FollowersRepository } from './followers.repository';
// import { UserRepository } from '../user/user.repository';

@Injectable()
export class FollowersService {
  constructor(
    private readonly followersRepository: FollowersRepository
    // private readonly userRepository: UserRepository
  ) {}

  //   async getFollowing(userId: string, page: number, limit: number) {
  //       throw new Error('Method not implemented.');
  //   }
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
          //   followersCount: u.followersCount ?? 0,
          isFollowedBack,
        };
      })
    );

    return {
      status: 'success',
      data: {
        followers: enriched,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_count: total,
          limit,
        },
      },
    };
  }
  //   async getFollowingCount(userId: string) {
  //       throw new Error('Method not implemented.');
  //   }
  //   async getFollowersCount(userId: string) {

  //   }
  async getFollowStatus(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('Cannot check follow status with yourself');
    }
    const result = await this.followersRepository.getFollowStatus(currentUserId, targetUserId);
    return {
      status: 'success',
      data: {
        follow_status: result.status,
        ...(result.since && { since: result.since }),
      },
    };
  }

  async unfollowUser(followerId: string, followedId: string) {
    if (followerId === followedId) {
      throw new BadRequestException('You cannot unfollow yourself');
    }
    const deleted = this.followersRepository.deleteFollow(followerId, followedId);
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
    return {
      status: 'success',
      data: {
        followerId: follow.follower,
        followedId: follow.followed,
        createdAt: follow.createdAt,
      },
    };
  }
}
