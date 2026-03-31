import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { FollowersService } from './followers.service';
import { FollowersRepository } from './followers.repository';
import { UserRepository } from '../user/user.repository';
import {
  mockFollowerId,
  mockFollowedId,
  mockUserFollow,
  mockPublicUser,
  mockFollowersList,
  mockFollowersRepository,
  mockUserRepository,
} from './test/followers.mock';

describe('FollowersService', () => {
  let service: FollowersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowersService,
        { provide: FollowersRepository, useValue: mockFollowersRepository },
        { provide: UserRepository, useValue: mockUserRepository },
      ],
    }).compile();

    service = module.get<FollowersService>(FollowersService);

    mockUserRepository.findById.mockResolvedValue(mockPublicUser());
    mockFollowersRepository.isFollowing.mockResolvedValue(false);
  });

  describe('followUser', () => {
    it('should create a follow and return formatted response', async () => {
      mockFollowersRepository.isFollowing.mockResolvedValue(false);
      mockFollowersRepository.createFollow.mockResolvedValue(mockUserFollow);

      const result = await service.followUser(mockFollowerId, mockFollowedId);

      expect(result).toEqual({
        status: 'success',
        data: {
          followerId: mockUserFollow.follower,
          followedId: mockUserFollow.followed,
          createdAt: mockUserFollow.createdAt,
        },
      });
      expect(mockFollowersRepository.isFollowing).toHaveBeenCalledWith(
        mockFollowerId,
        mockFollowedId
      );
      expect(mockFollowersRepository.createFollow).toHaveBeenCalledWith(
        mockFollowerId,
        mockFollowedId
      );
    });

    it('should throw BadRequestException when following self', async () => {
      await expect(service.followUser(mockFollowerId, mockFollowerId)).rejects.toThrow(
        new BadRequestException('You cannot follow yourself')
      );
      expect(mockFollowersRepository.isFollowing).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when already following', async () => {
      mockFollowersRepository.isFollowing.mockResolvedValue(true);

      await expect(service.followUser(mockFollowerId, mockFollowedId)).rejects.toThrow(
        new ConflictException('You are already following this user')
      );
      expect(mockFollowersRepository.createFollow).not.toHaveBeenCalled();
    });
  });

  describe('unfollowUser', () => {
    it('should delete the follow and return success', async () => {
      mockFollowersRepository.deleteFollow.mockResolvedValue(true);

      const result = await service.unfollowUser(mockFollowerId, mockFollowedId);

      expect(result).toEqual({ status: 'success', message: 'Successfully unfollowed user' });
      expect(mockFollowersRepository.deleteFollow).toHaveBeenCalledWith(
        mockFollowerId,
        mockFollowedId
      );
    });

    it('should throw BadRequestException when unfollowing self', async () => {
      await expect(service.unfollowUser(mockFollowerId, mockFollowerId)).rejects.toThrow(
        new BadRequestException('You cannot unfollow yourself')
      );
      expect(mockFollowersRepository.deleteFollow).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when follow relationship does not exist', async () => {
      mockFollowersRepository.deleteFollow.mockResolvedValue(false);

      await expect(service.unfollowUser(mockFollowerId, mockFollowedId)).rejects.toThrow(
        new NotFoundException('You are not following this user')
      );
    });
  });

  describe('getFollowStatus', () => {
    it('should return not_following status without since', async () => {
      mockFollowersRepository.getFollowStatus.mockResolvedValue({ status: 'notFollowing' });

      const result = await service.getFollowStatus(mockFollowerId, mockFollowedId);

      expect(result).toEqual({
        status: 'success',
        data: { followStatus: 'notFollowing' },
      });
      expect(result.data).not.toHaveProperty('since');
    });

    it('should return following status with since', async () => {
      mockFollowersRepository.getFollowStatus.mockResolvedValue({
        status: 'following',
        since: mockUserFollow.createdAt,
      });

      const result = await service.getFollowStatus(mockFollowerId, mockFollowedId);

      expect(result).toEqual({
        status: 'success',
        data: { followStatus: 'following', since: mockUserFollow.createdAt },
      });
    });

    it('should return mutual status with since', async () => {
      mockFollowersRepository.getFollowStatus.mockResolvedValue({
        status: 'mutual',
        since: mockUserFollow.createdAt,
      });

      const result = await service.getFollowStatus(mockFollowerId, mockFollowedId);

      expect(result.data.followStatus).toBe('mutual');
      expect(result.data.since).toEqual(mockUserFollow.createdAt);
    });

    it('should throw BadRequestException when checking status with self', async () => {
      await expect(service.getFollowStatus(mockFollowerId, mockFollowerId)).rejects.toThrow(
        new BadRequestException('Cannot check follow status with yourself')
      );
      expect(mockFollowersRepository.getFollowStatus).not.toHaveBeenCalled();
    });
  });

  describe('getFollowers', () => {
    it('should default followersCount to 0 when undefined', async () => {
      mockFollowersRepository.getFollowers.mockResolvedValue({
        users: [mockPublicUser({ userId: 'user-1', followersCount: undefined })],
        total: 1,
      });

      const result = await service.getFollowers(mockFollowedId, 1, 20);

      expect(result.data.followers[0].followersCount).toBe(0);
    });
    it('should return enriched followers list with isFollowedBack=false', async () => {
      mockFollowersRepository.getFollowers.mockResolvedValue({
        users: mockFollowersList,
        total: 3,
      });
      mockFollowersRepository.isFollowing.mockResolvedValue(false);

      const result = await service.getFollowers(mockFollowedId, 1, 20);

      expect(result.status).toBe('success');
      expect(result.data.followers).toHaveLength(3);
      result.data.followers.forEach((f) => {
        expect(f.isFollowedBack).toBe(false);
        expect(f).toHaveProperty('userId');
        expect(f).toHaveProperty('username');
        expect(f).toHaveProperty('displayName');
        expect(f).toHaveProperty('avatarUrl');
        expect(f).toHaveProperty('followersCount');
      });
    });

    it('should return enriched followers list with isFollowedBack=true', async () => {
      mockFollowersRepository.getFollowers.mockResolvedValue({
        users: mockFollowersList,
        total: 3,
      });
      mockFollowersRepository.isFollowing.mockResolvedValue(true);

      const result = await service.getFollowers(mockFollowedId, 1, 20);

      result.data.followers.forEach((f) => expect(f.isFollowedBack).toBe(true));
    });

    it('should calculate pagination correctly', async () => {
      mockFollowersRepository.getFollowers.mockResolvedValue({
        users: mockFollowersList,
        total: 45,
      });

      const result = await service.getFollowers(mockFollowedId, 2, 20);

      expect(result.data.pagination).toEqual({
        currentPage: 2,
        totalPages: 3,
        totalCount: 45,
        limit: 20,
      });
    });

    it('should handle null displayName and avatarUrl gracefully', async () => {
      const usersWithNulls = [
        mockPublicUser({ userId: 'user-1', displayName: undefined, avatarUrl: undefined }),
      ];
      mockFollowersRepository.getFollowers.mockResolvedValue({ users: usersWithNulls, total: 1 });

      const result = await service.getFollowers(mockFollowedId, 1, 20);

      expect(result.data.followers[0].displayName).toBeNull();
      expect(result.data.followers[0].avatarUrl).toBeNull();
    });

    it('should return empty followers list with correct pagination', async () => {
      mockFollowersRepository.getFollowers.mockResolvedValue({ users: [], total: 0 });

      const result = await service.getFollowers(mockFollowedId, 1, 20);

      expect(result.data.followers).toHaveLength(0);
      expect(result.data.pagination.totalPages).toBe(0);
      expect(result.data.pagination.totalCount).toBe(0);
    });
  });

  describe('getFollowing', () => {
    it('should default followersCount to 0 when undefined', async () => {
      mockFollowersRepository.getFollowing.mockResolvedValue({
        users: [mockPublicUser({ userId: 'user-1', followersCount: undefined })],
        total: 1,
      });

      const result = await service.getFollowing(mockFollowedId, 1, 20);

      expect(result.data.following[0].followersCount).toBe(0);
    });
    it('should return enriched following list with isFollowingBack=false', async () => {
      mockFollowersRepository.getFollowing.mockResolvedValue({
        users: mockFollowersList,
        total: 3,
      });
      mockFollowersRepository.isFollowing.mockResolvedValue(false);

      const result = await service.getFollowing(mockFollowerId, 1, 20);

      expect(result.status).toBe('success');
      expect(result.data.following).toHaveLength(3);
      result.data.following.forEach((f) => {
        expect(f.isFollowingBack).toBe(false);
        expect(f).toHaveProperty('userId');
        expect(f).toHaveProperty('username');
        expect(f).toHaveProperty('displayName');
        expect(f).toHaveProperty('avatarUrl');
        expect(f).toHaveProperty('followersCount');
      });
    });

    it('should return enriched following list with isFollowingBack=true', async () => {
      mockFollowersRepository.getFollowing.mockResolvedValue({
        users: mockFollowersList,
        total: 3,
      });
      mockFollowersRepository.isFollowing.mockResolvedValue(true);

      const result = await service.getFollowing(mockFollowerId, 1, 20);

      result.data.following.forEach((f) => expect(f.isFollowingBack).toBe(true));
    });

    it('should calculate pagination correctly', async () => {
      mockFollowersRepository.getFollowing.mockResolvedValue({
        users: mockFollowersList,
        total: 60,
      });

      const result = await service.getFollowing(mockFollowerId, 3, 20);

      expect(result.data.pagination).toEqual({
        currentPage: 3,
        totalPages: 3,
        totalCount: 60,
        limit: 20,
      });
    });

    it('should handle null displayName and avatarUrl gracefully', async () => {
      const usersWithNulls = [
        mockPublicUser({ userId: 'user-1', displayName: undefined, avatarUrl: undefined }),
      ];
      mockFollowersRepository.getFollowing.mockResolvedValue({ users: usersWithNulls, total: 1 });

      const result = await service.getFollowing(mockFollowerId, 1, 20);

      expect(result.data.following[0].displayName).toBeNull();
      expect(result.data.following[0].avatarUrl).toBeNull();
    });

    it('should return empty following list with correct pagination', async () => {
      mockFollowersRepository.getFollowing.mockResolvedValue({ users: [], total: 0 });

      const result = await service.getFollowing(mockFollowerId, 1, 20);

      expect(result.data.following).toHaveLength(0);
      expect(result.data.pagination.totalCount).toBe(0);
    });
  });

  describe('getFollowersCount', () => {
    it('should return followers count from user row', async () => {
      mockUserRepository.findById.mockResolvedValue(mockPublicUser({ followersCount: 1024 }));

      const result = await service.getFollowersCount(mockFollowedId);

      expect(result).toEqual({
        status: 'success',
        data: { user_id: mockFollowedId, followers_count: 1024 },
      });
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockFollowedId);
    });

    it('should return 0 when followersCount is 0', async () => {
      mockUserRepository.findById.mockResolvedValue(mockPublicUser({ followersCount: 0 }));

      const result = await service.getFollowersCount(mockFollowedId);

      expect(result.data.followers_count).toBe(0);
    });
  });

  describe('getFollowingCount', () => {
    it('should return following count from user row', async () => {
      mockUserRepository.findById.mockResolvedValue(mockPublicUser({ followingsCount: 512 }));

      const result = await service.getFollowingCount(mockFollowedId);

      expect(result).toEqual({
        status: 'success',
        data: { user_id: mockFollowedId, followings_count: 512 },
      });
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockFollowedId);
    });

    it('should return 0 when followingsCount is 0', async () => {
      mockUserRepository.findById.mockResolvedValue(mockPublicUser({ followingsCount: 0 }));

      const result = await service.getFollowingCount(mockFollowedId);

      expect(result.data.followings_count).toBe(0);
    });
  });
});
