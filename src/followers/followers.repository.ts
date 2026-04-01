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
  ): Promise<{ status: 'following' | 'notFollowing' | 'mutual'; since?: Date }> {
    const follow = await this.followRepository.findOne({
      where: { follower: currentUserId, followed: targetUserId },
      order: { createdAt: 'ASC' },
    });

    if (!follow) {
      return { status: 'notFollowing' };
    }

    const isMutual = await this.isMutualFollow(currentUserId, targetUserId);

    return {
      status: isMutual ? 'mutual' : 'following',
      since: follow.createdAt,
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
        await transactionalEntityManager.decrement(
          User,
          { userId: blockerId },
          'followingsCount',
          1
        );
        await transactionalEntityManager.decrement(
          User,
          { userId: blockedId },
          'followersCount',
          1
        );
      }

      const blockedToFollower = await transactionalEntityManager.findOne(UserFollow, {
        where: { follower: blockedId, followed: blockerId },
      });
      if (blockedToFollower) {
        await transactionalEntityManager.remove(UserFollow, blockedToFollower);
        await transactionalEntityManager.decrement(
          User,
          { userId: blockedId },
          'followingsCount',
          1
        );
        await transactionalEntityManager.decrement(
          User,
          { userId: blockerId },
          'followersCount',
          1
        );
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
      .innerJoin('user_follows', 'f1', 'f1.follower = user.user_id')
      .innerJoin('user_follows', 'f2', 'f2.follower = user.user_id')
      .where('f1.followed = :targetUserId', { targetUserId })
      .andWhere('f2.followed = :currentUserId', { currentUserId })
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
}
