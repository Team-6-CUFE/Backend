import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFollow } from './entities/user-follows.entity';
import { UserBlock } from './entities/user-blocks.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class FollowersRepository {
  constructor(
    @InjectRepository(UserFollow)
    private followRepository: Repository<UserFollow>,
    @InjectRepository(UserBlock)
    private blockRepository: Repository<UserBlock>,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async hasBlockRelationship(userA: string, userB: string): Promise<boolean> {
    const block = await this.blockRepository.findOne({
      where: [
        { blocker: userA, blocked: userB },
        { blocker: userB, blocked: userA },
      ],
    });

    return block !== null;
  }

  async createFollow(followerId: string, followedId: string): Promise<UserFollow> {
    const follow = await this.followRepository.create({
      follower: followerId,
      followed: followedId,
    });
    return this.followRepository.save(follow);
  }

  async deleteFollow(followerId: string, followedId: string): Promise<boolean> {
    const result = await this.followRepository.delete({
      follower: followerId,
      followed: followedId,
    });
    return (result.affected ?? 0) > 0;
  }

  async getFollowers(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ users: Partial<User>[]; total: number }> {
    const offset: number = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user_follows', 'uf', 'uf.follower = user.user_id')
        .where('uf.followed = :userId', { userId })
        .select([
          'user.userId',
          'user.username',
          'user.displayName',
          'user.avatarUrl',
          'user.followersCount',
        ])
        .skip(offset)
        .take(limit)
        .getMany(),

      this.followRepository.count({ where: { followed: userId } }),
    ]);

    return { users, total };
  }

  async getFollowing(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ users: Partial<User>[]; total: number }> {
    const offset: number = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user_follows', 'uf', 'uf.followed = user.user_id')
        .where('uf.follower = :userId', { userId })
        .select([
          'user.userId',
          'user.username',
          'user.displayName',
          'user.avatarUrl',
          'user.followersCount',
        ])
        .skip(offset)
        .take(limit)
        .getMany(),

      this.followRepository.count({ where: { follower: userId } }),
    ]);

    return { users, total };
  }

  async isFollowing(followerId: string, followedId: string): Promise<boolean> {
    const follow = await this.followRepository.findOne({
      where: { follower: followerId, followed: followedId },
    });
    return follow !== null;
  }

  async isMutualFollow(userAId: string, userBId: string): Promise<boolean> {
    const [aFollowsB, bFollowsA] = await Promise.all([
      this.followRepository.findOne({ where: { follower: userAId, followed: userBId } }),
      this.followRepository.findOne({ where: { follower: userBId, followed: userAId } }),
    ]);
    return aFollowsB !== null && bFollowsA !== null;
  }

  async getFollowStatus(
    currentUserId: string,
    targetUserId: string
  ): Promise<{ status: 'following' | 'notFollowing' | 'mutual' | 'followsYou'; since?: Date }> {
    const [follow, reverseFollow] = await Promise.all([
      this.followRepository.findOne({
        where: { follower: currentUserId, followed: targetUserId },
        order: { createdAt: 'ASC' },
      }),
      this.followRepository.findOne({
        where: { follower: targetUserId, followed: currentUserId },
        order: { createdAt: 'ASC' },
      }),
    ]);

    if (!follow && !reverseFollow) return { status: 'notFollowing' };
    if (!follow && reverseFollow) return { status: 'followsYou' };

    const isMutual = !!reverseFollow;
    return {
      status: isMutual ? 'mutual' : 'following',
      since: follow!.createdAt,
    };
  }

  async countFollowers(userId: string): Promise<number> {
    const result = await this.followRepository.count({
      where: { followed: userId },
    });
    return result;
  }

  async countFollowing(userId: string): Promise<number> {
    const result = await this.followRepository.count({
      where: { follower: userId },
    });
    return result;
  }

  async createBlockAndHandleFollows(blockerId: string, blockedId: string): Promise<UserBlock> {
    // We use the manager's transaction feature to safely execute everything together
    return this.blockRepository.manager.transaction(async (transactionalEntityManager) => {
      const followerToBlocked = await transactionalEntityManager.findOne(UserFollow, {
        where: { follower: blockerId, followed: blockedId },
      });
      if (followerToBlocked) {
        await transactionalEntityManager.remove(UserFollow, followerToBlocked);
      }

      const blockedToFollower = await transactionalEntityManager.findOne(UserFollow, {
        where: { follower: blockedId, followed: blockerId },
      });
      if (blockedToFollower) {
        await transactionalEntityManager.remove(UserFollow, blockedToFollower);
      }

      const newBlock = transactionalEntityManager.create(UserBlock, {
        blocker: blockerId,
        blocked: blockedId,
      });

      return transactionalEntityManager.save(newBlock);
    });
  }

  async isBlocking(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await this.blockRepository.findOne({
      where: { blocker: blockerId, blocked: blockedId },
    });
    return block !== null;
  }

  async deleteBlock(blockerId: string, blockedId: string): Promise<boolean> {
    const result = await this.blockRepository.delete({
      blocker: blockerId,
      blocked: blockedId,
    });

    return (result.affected ?? 0) > 0;
  }

  async getBlockedUsers(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ users: Partial<User>[]; total: number }> {
    const offset: number = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user_blocks', 'ub', 'ub.blocked = user.user_id')
        .where('ub.blocker = :userId', { userId })
        .select(['user.userId', 'user.username', 'user.displayName', 'user.avatarUrl'])
        .skip(offset)
        .take(limit)
        .getMany(),

      this.blockRepository.count({ where: { blocker: userId } }),
    ]);

    return { users, total };
  }

  async getBlockRelationship(userA: string, userB: string): Promise<UserBlock[]> {
    return this.blockRepository.find({
      where: [
        { blocker: userA, blocked: userB },
        { blocker: userB, blocked: userA },
      ],
    });
  }

  async getMutualFollowers(
    currentUserId: string,
    targetUserId: string,
    page: number,
    limit: number
  ): Promise<{ users: Partial<User>[]; total: number }> {
    const offset = (page - 1) * limit;

    const query = this.userRepository
      .createQueryBuilder('user')
      // 1. Ensure the Viewer (currentUserId) follows this user
      .innerJoin(
        'user_follows',
        'my_following',
        'my_following.followed = user.user_id AND my_following.follower = :currentUserId',
        { currentUserId }
      )
      // 2. Ensure this user follows the Target (targetUserId)
      .innerJoin(
        'user_follows',
        'target_followers',
        'target_followers.follower = user.user_id AND target_followers.followed = :targetUserId',
        { targetUserId }
      )
      .select(['user.userId', 'user.username', 'user.displayName', 'user.avatarUrl']);

    const [users, total] = await Promise.all([
      query.skip(offset).take(limit).getMany(),
      query.getCount(),
    ]);

    return { users, total };
  }

  async getSuggestedUsers(
    userId: string,
    page: number,
    limit: number,
    by?: string
  ): Promise<{ users: Partial<User>[]; total: number }> {
    const offset = (page - 1) * limit;

    const query = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.userId',
        'user.username',
        'user.displayName',
        'user.avatarUrl',
        'user.followersCount',
      ])
      // 1. Exclude the current user
      .where('user.userId != :userId', { userId })

      // 2. Exclude users the current user is already following
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('uf.followed')
          .from(UserFollow, 'uf')
          .where('uf.follower = :userId')
          .getQuery();
        return `user.user_id NOT IN ${subQuery}`;
      })

      // 3. Exclude users the current user has blocked
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('ub.blocked')
          .from(UserBlock, 'ub')
          .where('ub.blocker = :userId')
          .getQuery();
        return `user.user_id NOT IN ${subQuery}`;
      })

      // 4. Exclude users who have blocked the current user
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('ub2.blocker')
          .from(UserBlock, 'ub2')
          .where('ub2.blocked = :userId')
          .getQuery();
        return `user.user_id NOT IN ${subQuery}`;
      });

    // Apply filters
    if (by === 'popular') {
      query.orderBy('user.followersCount', 'DESC');
    } else if (by === 'mutuals') {
      // Join follow table twice to find people followed by people you follow
      query
        .innerJoin('user_follows', 'mutual', 'mutual.followed = user.user_id')
        .innerJoin(
          'user_follows',
          'my_follows',
          'my_follows.followed = mutual.follower AND my_follows.follower = :userId',
          { userId }
        )
        .groupBy('user.userId')
        .orderBy('user.followersCount', 'DESC');
    } else if (by === 'genre') {
      // A. Fetch the current user's favorite genres
      const currentUser = await this.userRepository
        .createQueryBuilder('u')
        .leftJoinAndSelect('u.favoriteGenres', 'fg')
        .leftJoinAndSelect('fg.genre', 'g')
        .where('u.userId = :userId', { userId })
        .getOne();

      const genreIds =
        currentUser?.favoriteGenres?.map((fg) => fg.genre?.genreId).filter(Boolean) || [];

      // B. If they have genres, find other users with matching genres
      if (genreIds.length > 0) {
        query
          .innerJoin('user.favoriteGenres', 'suggested_fg')
          .innerJoin('suggested_fg.genre', 'sg_genre')
          .andWhere('sg_genre.genre_id IN (:...genreIds)', { genreIds })
          .groupBy('user.userId')
          .orderBy('user.followersCount', 'DESC');
      } else {
        // Fallback: If the user hasn't selected any genres, just show popular accounts
        query.orderBy('user.followersCount', 'DESC');
      }
    } else {
      // Default fallback (no 'by' parameter provided)
      query.orderBy('user.followersCount', 'DESC');
    }

    // Execute query with pagination
    const [users, total] = await Promise.all([
      query.skip(offset).take(limit).getMany(),
      query.getCount(),
    ]);

    return { users, total };
  }

  async getFriends(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ users: Partial<User>[]; total: number }> {
    const offset = (page - 1) * limit;

    const query = this.userRepository
      .createQueryBuilder('user')
      // 1. Ensure the provided userId follows this user
      .innerJoin(
        'user_follows',
        'following',
        'following.followed = user.user_id AND following.follower = :userId',
        { userId }
      )
      // 2. Ensure this user follows the provided userId back
      .innerJoin(
        'user_follows',
        'follower',
        'follower.follower = user.user_id AND follower.followed = :userId',
        { userId }
      )
      .select([
        'user.userId',
        'user.username',
        'user.displayName',
        'user.avatarUrl',
        'user.followersCount',
      ]);

    const [users, total] = await Promise.all([
      query.skip(offset).take(limit).getMany(),
      query.getCount(),
    ]);

    return { users, total };
  }

  async getFollowingIds(userId: string): Promise<string[]> {
    const ids = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user_follows', 'uf', 'uf.followed = user.user_id')
      .where('uf.follower = :userId', { userId })
      .select('user.userId')
      .getMany();

    return ids.map((u) => u.userId);
  }
}
