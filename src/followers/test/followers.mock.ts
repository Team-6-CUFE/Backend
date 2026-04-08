import { UserFollow } from '../entities/user-follows.entity';
import { User } from '../../user/entities/user.entity';

export const mockFollowerId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
export const mockFollowedId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

export const mockUserFollow = {
  follower: mockFollowerId,
  followed: mockFollowedId,
  createdAt: new Date('2025-01-15T08:30:00Z'),
} as UserFollow;

export const mockUserBlock = {
  blocker: mockFollowerId,
  blocked: mockFollowedId,
  createdAt: new Date('2026-03-31T10:00:00Z'),
};

export const mockPublicUser = (overrides: Partial<User> = {}): Partial<User> => ({
  userId: mockFollowedId,
  username: 'john_doe',
  displayName: 'John Doe',
  avatarUrl: 'https://s3.amazonaws.com/avatars/john.jpg',
  followersCount: 100,
  followingsCount: 50,
  isPublic: true,
  isSuspended: false,
  ...overrides,
});

export const mockFollowersList: Partial<User>[] = [
  mockPublicUser({ userId: 'user-1', username: 'user_one', followersCount: 10 }),
  mockPublicUser({ userId: 'user-2', username: 'user_two', followersCount: 20 }),
  mockPublicUser({ userId: 'user-3', username: 'user_three', followersCount: 30 }),
];

export const mockMutualFollowersData = {
  users: [
    {
      userId: 'usr_789',
      username: 'john_doe',
      displayName: 'John Doe',
      avatarUrl: 'https://s3.amazonaws.com/avatars/usr_789.jpg',
    },
  ],
  total: 1,
};

export const mockSuggestedUsersData = {
  users: [
    {
      userId: 'suggested-1',
      username: 'trending_artist',
      displayName: 'Trending Artist',
      avatarUrl: 'https://s3.amazonaws.com/avatars/1.jpg',
      followersCount: 5000,
    },
  ],
  total: 1,
};

export const mockFollowersRepository = {
  hasBlockRelationship: jest.fn(),
  createFollow: jest.fn(),
  deleteFollow: jest.fn(),
  getFollowers: jest.fn(),
  getFollowing: jest.fn(),
  isFollowing: jest.fn(),
  isMutualFollow: jest.fn(),
  getFollowStatus: jest.fn(),
  countFollowers: jest.fn(),
  countFollowing: jest.fn(),
  isBlocking: jest.fn(),
  createBlockAndHandleFollows: jest.fn(),
  deleteBlock: jest.fn(),
  getBlockedUsers: jest.fn(),
  getBlockRelationship: jest.fn(),
  getMutualFollowers: jest.fn(),
  getSuggestedUsers: jest.fn(),
  getFriends: jest.fn(),
};

export const mockUserRepository = {
  findById: jest.fn(),
};

export const mockFollowersService = {
  followUser: jest.fn(),
  unfollowUser: jest.fn(),
  getFollowStatus: jest.fn(),
  getFollowers: jest.fn(),
  getFollowing: jest.fn(),
  getFollowersCount: jest.fn(),
  getFollowingCount: jest.fn(),
  blockUser: jest.fn(),
  unblockUser: jest.fn(),
  getBlockedUsers: jest.fn(),
  getBlockStatus: jest.fn(),
  getMutualFollowers: jest.fn(),
  getSuggestedUsers: jest.fn(),
  getFriends: jest.fn(),
};
