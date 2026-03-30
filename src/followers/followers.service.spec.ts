// import { Test, TestingModule } from '@nestjs/testing';
// import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
// import { FollowersService } from './followers.repository';
// import { FollowersRepository } from './followers.repository';
// import {
//   createMockFollowersRepository,
//   mockUserId,
//   mockTargetUserId,
//   mockFollow,
//   mockFollowerUser,
//   mockFollowersRepository,
// } from './test/mocks';

// describe('FollowersService', () => {
//   let service: FollowersService;

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         FollowersService,
//         {
//           provide: FollowersRepository,
//           useFactory: createMockFollowersRepository,
//         },
//       ],
//     }).compile();

//     service = module.get<FollowersService>(FollowersService);
//     jest.clearAllMocks();
//   });

//   describe('followUser', () => {
//     it('should successfully follow a user', async () => {
//       mockUserExists(true);
//       mockFindFollow(null);
//       mockCreateFollow(mockFollow);

//       const result = await service.followUser(mockUserId, mockTargetUserId);

//       expect(result).toEqual({
//         follower_id: mockUserId,
//         followed_id: mockTargetUserId,
//         created_at: mockFollow.created_at,
//       });
//       expect(mockFollowersRepository.userExists).toHaveBeenCalledWith(mockTargetUserId);
//       expect(mockFollowersRepository.findFollow).toHaveBeenCalledWith(mockUserId, mockTargetUserId);
//       expect(mockFollowersRepository.createFollow).toHaveBeenCalledWith(mockUserId, mockTargetUserId);
//       // Note: Counts are derived, no update calls needed
//     });

//     it('should throw BadRequestException when trying to follow self', async () => {
//       await expect(service.followUser(mockUserId, mockUserId)).rejects.toThrow(
//         BadRequestException,
//       );
//       await expect(service.followUser(mockUserId, mockUserId)).rejects.toThrow(
//         'You cannot follow yourself',
//       );
//     });

//     it('should throw NotFoundException when target user does not exist', async () => {
//       mockUserExists(false);

//       await expect(service.followUser(mockUserId, mockTargetUserId)).rejects.toThrow(
//         NotFoundException,
//       );
//       await expect(service.followUser(mockUserId, mockTargetUserId)).rejects.toThrow(
//         'User not found',
//       );
//     });

//     it('should throw ConflictException when already following', async () => {
//       mockUserExists(true);
//       mockFindFollow(mockFollow);

//       await expect(service.followUser(mockUserId, mockTargetUserId)).rejects.toThrow(
//         ConflictException,
//       );
//       await expect(service.followUser(mockUserId, mockTargetUserId)).rejects.toThrow(
//         'You are already following this user',
//       );
//     });
//   });

//   describe('unfollowUser', () => {
//     it('should successfully unfollow a user', async () => {
//       mockUserExists(true);
//       mockFindFollow(mockFollow);
//       mockDeleteFollow(true);

//       const result = await service.unfollowUser(mockUserId, mockTargetUserId);

//       expect(result).toEqual({ message: 'Successfully unfollowed user' });
//       expect(mockFollowersRepository.deleteFollow).toHaveBeenCalledWith(
//         mockUserId,
//         mockTargetUserId,
//       );
//       // Note: Counts are derived, no update calls needed
//     });

//     it('should throw BadRequestException when trying to unfollow self', async () => {
//       await expect(service.unfollowUser(mockUserId, mockUserId)).rejects.toThrow(
//         BadRequestException,
//       );
//       await expect(service.unfollowUser(mockUserId, mockUserId)).rejects.toThrow(
//         'You cannot unfollow yourself',
//       );
//     });

//     it('should throw NotFoundException when target user does not exist', async () => {
//       mockUserExists(false);

//       await expect(service.unfollowUser(mockUserId, mockTargetUserId)).rejects.toThrow(
//         NotFoundException,
//       );
//     });

//     it('should throw NotFoundException when not following the user', async () => {
//       mockUserExists(true);
//       mockFindFollow(null);

//       await expect(service.unfollowUser(mockUserId, mockTargetUserId)).rejects.toThrow(
//         NotFoundException,
//       );
//       await expect(service.unfollowUser(mockUserId, mockTargetUserId)).rejects.toThrow(
//         'You are not following this user',
//       );
//     });
//   });

//   describe('getFollowStatus', () => {
//     it('should return following status when user is following', async () => {
//       mockUserExists(true);
//       mockGetFollowStatus({ status: 'following', since: mockFollow.created_at });

//       const result = await service.getFollowStatus(mockUserId, mockTargetUserId);

//       expect(result).toEqual({
//         follow_status: 'following',
//         since: mockFollow.created_at,
//       });
//     });

//     it('should return mutual status when both users follow each other', async () => {
//       mockUserExists(true);
//       mockGetFollowStatus({ status: 'mutual', since: mockFollow.created_at });

//       const result = await service.getFollowStatus(mockUserId, mockTargetUserId);

//       expect(result).toEqual({
//         follow_status: 'mutual',
//         since: mockFollow.created_at,
//       });
//     });

//     it('should return not_following status when not following', async () => {
//       mockUserExists(true);
//       mockGetFollowStatus({ status: 'not_following' });

//       const result = await service.getFollowStatus(mockUserId, mockTargetUserId);

//       expect(result).toEqual({
//         follow_status: 'not_following',
//       });
//     });

//     it('should throw NotFoundException when target user does not exist', async () => {
//       mockUserExists(false);

//       await expect(service.getFollowStatus(mockUserId, mockTargetUserId)).rejects.toThrow(
//         NotFoundException,
//       );
//     });
//   });

//   describe('getFollowers', () => {
//     const mockFollowersResult = {
//       users: [mockFollowerUser],
//       total: 1,
//     };

//     it('should return followers list for public user', async () => {
//       mockUserExists(true);
//       mockIsUserPublic(true);
//       mockGetFollowers(mockFollowersResult);
//       mockIsFollowing(true);

//       const result = await service.getFollowers(mockUserId, mockTargetUserId, 1, 20);

//       expect(result.followers).toHaveLength(1);
//       expect(result.pagination).toEqual({
//         current_page: 1,
//         total_pages: 1,
//         total_count: 1,
//         limit: 20,
//       });
//     });

//     it('should return followers list for private user when requester is owner', async () => {
//       mockUserExists(true);
//       mockIsUserPublic(false);
//       mockGetFollowers(mockFollowersResult);
//       mockIsFollowing(true);

//       const result = await service.getFollowers(mockTargetUserId, mockTargetUserId, 1, 20);

//       expect(result.followers).toHaveLength(1);
//     });

//     it('should throw ForbiddenException for private user when requester is not owner', async () => {
//       mockUserExists(true);
//       mockIsUserPublic(false);

//       await expect(
//         service.getFollowers(mockUserId, mockTargetUserId, 1, 20),
//       ).rejects.toThrow(ForbiddenException);
//       await expect(
//         service.getFollowers(mockUserId, mockTargetUserId, 1, 20),
//       ).rejects.toThrow('This account is private');
//     });

//     it('should throw NotFoundException when target user does not exist', async () => {
//       mockUserExists(false);

//       await expect(
//         service.getFollowers(mockUserId, mockTargetUserId, 1, 20),
//       ).rejects.toThrow(NotFoundException);
//     });
//   });

//   describe('getFollowing', () => {
//     const mockFollowingResult = {
//       users: [mockFollowerUser],
//       total: 1,
//     };

//     it('should return following list for public user', async () => {
//       mockUserExists(true);
//       mockIsUserPublic(true);
//       mockGetFollowing(mockFollowingResult);
//       mockIsFollowing(true);

//       const result = await service.getFollowing(mockUserId, mockTargetUserId, 1, 20);

//       expect(result.following).toHaveLength(1);
//       expect(result.pagination).toEqual({
//         current_page: 1,
//         total_pages: 1,
//         total_count: 1,
//         limit: 20,
//       });
//     });

//     it('should throw ForbiddenException for private user when requester is not owner', async () => {
//       mockUserExists(true);
//       mockIsUserPublic(false);

//       await expect(
//         service.getFollowing(mockUserId, mockTargetUserId, 1, 20),
//       ).rejects.toThrow(ForbiddenException);
//     });
//   });

//   describe('getFollowersCount', () => {
//     it('should return followers count for public user', async () => {
//       mockUserExists(true);
//       mockIsUserPublic(true);
//       mockGetFollowersCount(1024);

//       const result = await service.getFollowersCount(mockUserId, mockTargetUserId);

//       expect(result).toEqual({
//         user_id: mockTargetUserId,
//         followers_count: 1024,
//       });
//     });

//     it('should throw ForbiddenException for private user when requester is not owner', async () => {
//       mockUserExists(true);
//       mockIsUserPublic(false);

//       await expect(
//         service.getFollowersCount(mockUserId, mockTargetUserId),
//       ).rejects.toThrow(ForbiddenException);
//     });

//     it('should throw NotFoundException when target user does not exist', async () => {
//       mockUserExists(false);

//       await expect(
//         service.getFollowersCount(mockUserId, mockTargetUserId),
//       ).rejects.toThrow(NotFoundException);
//     });
//   });

//   describe('getFollowingCount', () => {
//     it('should return following count for public user', async () => {
//       mockUserExists(true);
//       mockIsUserPublic(true);
//       mockGetFollowingCount(512);

//       const result = await service.getFollowingCount(mockUserId, mockTargetUserId);

//       expect(result).toEqual({
//         user_id: mockTargetUserId,
//         followings_count: 512,
//       });
//     });

//     it('should throw ForbiddenException for private user when requester is not owner', async () => {
//       mockUserExists(true);
//       mockIsUserPublic(false);

//       await expect(
//         service.getFollowingCount(mockUserId, mockTargetUserId),
//       ).rejects.toThrow(ForbiddenException);
//     });
//   });
// });
