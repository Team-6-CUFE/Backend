import { Test, TestingModule } from '@nestjs/testing';
import { FollowersController } from './followers.controller';
import { FollowersService } from './followers.service';
import {
  mockFollowerId,
  mockFollowedId,
  mockUserFollow,
  mockFollowersService,
  mockUserBlock,
} from './test/followers.mock';

jest.mock('./decorators/no-block.decorator', () => ({
  CheckBlock: () => jest.fn(),
}));
jest.mock('./decorators/user-exists.decorator', () => ({
  CheckUserExists: (..._args: string[]) => jest.fn(),
}));

describe('FollowersController', () => {
  let controller: FollowersController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FollowersController],
      providers: [{ provide: FollowersService, useValue: mockFollowersService }],
    }).compile();

    controller = module.get<FollowersController>(FollowersController);
  });

  describe('followUser', () => {
    it('should call service.followUser with correct args and return result', async () => {
      const expected = {
        status: 'success',
        data: {
          followerId: mockFollowerId,
          followedId: mockFollowedId,
          createdAt: mockUserFollow.createdAt,
        },
      };
      mockFollowersService.followUser.mockResolvedValue(expected);

      const result = await controller.followUser(mockFollowerId, mockFollowedId);

      expect(mockFollowersService.followUser).toHaveBeenCalledWith(mockFollowerId, mockFollowedId);
      expect(result).toEqual(expected);
    });
  });

  describe('blockUser', () => {
    it('should call service.blockUser with correct args and return result', async () => {
      const expected = {
        status: 'success',
        data: {
          blocker_id: mockFollowerId,
          blocked_id: mockFollowedId,
          created_at: mockUserBlock.createdAt,
        },
      };
      mockFollowersService.blockUser.mockResolvedValue(expected);

      const result = await controller.blockUser(mockFollowerId, mockFollowedId);

      expect(mockFollowersService.blockUser).toHaveBeenCalledWith(mockFollowerId, mockFollowedId);
      expect(result).toEqual(expected);
    });
  });

  describe('unfollowUser', () => {
    it('should call service.unfollowUser with correct args and return result', async () => {
      const expected = { status: 'success', message: 'Successfully unfollowed user' };
      mockFollowersService.unfollowUser.mockResolvedValue(expected);

      const result = await controller.unfollowUser(mockFollowerId, mockFollowedId);

      expect(mockFollowersService.unfollowUser).toHaveBeenCalledWith(
        mockFollowerId,
        mockFollowedId
      );
      expect(result).toEqual(expected);
    });
  });

  describe('getFollowStatus', () => {
    it('should call service.getFollowStatus with correct args and return result', async () => {
      const expected = {
        status: 'success',
        data: { followStatus: 'following', since: mockUserFollow.createdAt },
      };
      mockFollowersService.getFollowStatus.mockResolvedValue(expected);

      const result = await controller.getFollowStatus(mockFollowerId, mockFollowedId);

      expect(mockFollowersService.getFollowStatus).toHaveBeenCalledWith(
        mockFollowerId,
        mockFollowedId
      );
      expect(result).toEqual(expected);
    });
  });

  describe('getFollowersCount', () => {
    it('should call service.getFollowersCount with userId and return result', async () => {
      const expected = {
        status: 'success',
        data: { user_id: mockFollowedId, followers_count: 1024 },
      };
      mockFollowersService.getFollowersCount.mockResolvedValue(expected);

      const result = await controller.getFollowersCount(mockFollowedId);

      expect(mockFollowersService.getFollowersCount).toHaveBeenCalledWith(mockFollowedId);
      expect(result).toEqual(expected);
    });
  });

  describe('getFollowingCount', () => {
    it('should call service.getFollowingCount with userId and return result', async () => {
      const expected = {
        status: 'success',
        data: { user_id: mockFollowedId, followings_count: 512 },
      };
      mockFollowersService.getFollowingCount.mockResolvedValue(expected);

      const result = await controller.getFollowingCount(mockFollowedId);

      expect(mockFollowersService.getFollowingCount).toHaveBeenCalledWith(mockFollowedId);
      expect(result).toEqual(expected);
    });
  });

  describe('getFollowers', () => {
    it('should call service.getFollowers with explicit page and limit', async () => {
      const expected = { status: 'success', data: { followers: [], pagination: {} } };
      mockFollowersService.getFollowers.mockResolvedValue(expected);

      const result = await controller.getFollowers(mockFollowedId, 2, 10);

      expect(mockFollowersService.getFollowers).toHaveBeenCalledWith(mockFollowedId, 2, 10);
      expect(result).toEqual(expected);
    });

    it('should fall back to page=1 and limit=20 when query params are undefined', async () => {
      mockFollowersService.getFollowers.mockResolvedValue({ status: 'success' });

      await controller.getFollowers(mockFollowedId, undefined as any, undefined as any);

      expect(mockFollowersService.getFollowers).toHaveBeenCalledWith(mockFollowedId, 1, 20);
    });
  });

  describe('getFollowing', () => {
    it('should call service.getFollowing with explicit page and limit', async () => {
      const expected = { status: 'success', data: { following: [], pagination: {} } };
      mockFollowersService.getFollowing.mockResolvedValue(expected);

      const result = await controller.getFollowing(mockFollowedId, 3, 15);

      expect(mockFollowersService.getFollowing).toHaveBeenCalledWith(mockFollowedId, 3, 15);
      expect(result).toEqual(expected);
    });

    it('should fall back to page=1 and limit=20 when query params are undefined', async () => {
      mockFollowersService.getFollowing.mockResolvedValue({ status: 'success' });

      await controller.getFollowing(mockFollowedId, undefined as any, undefined as any);

      expect(mockFollowersService.getFollowing).toHaveBeenCalledWith(mockFollowedId, 1, 20);
    });
  });

  describe('unblockUser', () => {
    it('should call service.unblockUser with correct args and return result', async () => {
      const expected = { status: 'success', message: 'User successfully unblocked' };
      mockFollowersService.unblockUser.mockResolvedValue(expected);

      const result = await controller.unblockUser(mockFollowerId, mockFollowedId);

      expect(mockFollowersService.unblockUser).toHaveBeenCalledWith(mockFollowerId, mockFollowedId);
      expect(result).toEqual(expected);
    });
  });

  describe('getBlockedUsers', () => {
    it('should call service.getBlockedUsers with explicit page and limit', async () => {
      const expected = { status: 'success', data: { blocked_users: [], pagination: {} } };
      mockFollowersService.getBlockedUsers.mockResolvedValue(expected);

      const result = await controller.getBlockedUsers(mockFollowerId, 3, 15);

      expect(mockFollowersService.getBlockedUsers).toHaveBeenCalledWith(mockFollowerId, 3, 15);
      expect(result).toEqual(expected);
    });

    it('should fall back to page=1 and limit=20 when query params are undefined', async () => {
      mockFollowersService.getBlockedUsers.mockResolvedValue({ status: 'success' });

      await controller.getBlockedUsers(mockFollowerId, undefined as any, undefined as any);

      expect(mockFollowersService.getBlockedUsers).toHaveBeenCalledWith(mockFollowerId, 1, 20);
    });
  });
});
