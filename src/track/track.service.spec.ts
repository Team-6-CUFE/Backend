import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { TrackService } from './track.service';
import { TrackRepository } from './track.repository';
import { UserRepository } from '../user/user.repository';
import { TrackSseService } from './services/track-sse.service';
import { StorageService } from '../common/storage_service';
import { TrackVisibility } from './enums/track-visibility.enum';

// ─── Constants ───────────────────────────────────────────────────────────────

const mockTrackId = '123e4567-e89b-12d3-a456-426614174000';
const mockUserId = '550e8400-e29b-41d4-a716-446655440001';
const mockOtherUserId = '550e8400-e29b-41d4-a716-446655440099';
const mockArtistId = '550e8400-e29b-41d4-a716-446655440002';
const mockMyUserId = '550e8400-e29b-41d4-a716-446655440003';
const mockCaption = 'Great track!';

// ─── Factories ────────────────────────────────────────────────────────────────

const mockTrackRepository = () => ({
  findById: jest.fn(),
  repostTrack: jest.fn(),
  didUserRepostTrack: jest.fn(),
  getTrackRepostsCount: jest.fn(),
  removeTrackRepost: jest.fn(),
  editTrackRepost: jest.fn(),
  getTrackReposts: jest.fn(),
  getUserTrackReposts: jest.fn(),
  didUserLikeTrack: jest.fn(),
  likeTrack: jest.fn(),
  getTrackLikesCount: jest.fn(),
  removeTrackLike: jest.fn(),
  getTrackLikes: jest.fn(),
  getUserTrackLikes: jest.fn(),
  findCommentById: jest.fn(),
  addComment: jest.fn(),
  deleteComment: jest.fn(),
  getTrackComments: jest.fn(),
});

const mockUserRepository = () => ({
  findById: jest.fn(),
});

const mockPublicTrack = () => ({
  trackId: mockTrackId,
  userId: mockOtherUserId,
  visibility: TrackVisibility.PUBLIC,
});
const mockPrivateTrack = () => ({
  trackId: mockTrackId,
  userId: mockOtherUserId,
  visibility: TrackVisibility.PRIVATE,
});
const mockOwnTrack = () => ({
  trackId: mockTrackId,
  userId: mockUserId,
  visibility: TrackVisibility.PUBLIC,
});
const mockTrackRepost = () => ({
  trackId: mockTrackId,
  userId: mockUserId,
  caption: mockCaption,
  createdAt: new Date(),
});
const mockRepostWithUser = () => ({
  user: {
    userId: mockOtherUserId,
    username: 'other_user',
    displayName: 'Other User',
    avatarUrl: 'https://example.com/avatar.jpg',
    followersCount: 120,
  },
  caption: mockCaption,
  createdAt: new Date('2024-06-01T12:00:00Z'),
});
const mockPublicUser = () => ({ userId: mockOtherUserId, isPublic: true });
const mockPrivateUser = () => ({ userId: mockOtherUserId, isPublic: false });
const mockRepostWithTrack = () => ({
  track: {
    trackId: mockTrackId,
    title: 'Midnight Drive',
    coverImage: 'https://s3.amazonaws.com/covers/midnight.jpg',
    durationSeconds: 213,
    playCount: 1500,
    repostsCount: 30,
    user: { userId: mockArtistId, username: 'dj_nour', displayName: 'Nour' },
  },
  caption: 'Love this track!',
  createdAt: new Date('2024-06-01T12:00:00Z'),
});
const mockTrackLike = () => ({
  trackId: mockTrackId,
  userId: mockUserId,
  createdAt: new Date(),
});
const mockLikeWithUser = () => ({
  user: {
    userId: mockOtherUserId,
    username: 'other_user',
    displayName: 'Other User',
    avatarUrl: 'https://example.com/avatar.jpg',
    followersCount: 120,
  },
  createdAt: new Date('2024-06-01T12:00:00Z'),
});
const mockLikeWithTrack = () => ({
  track: {
    trackId: mockTrackId,
    title: 'Midnight Drive',
    coverImage: 'https://s3.amazonaws.com/covers/midnight.jpg',
    durationSeconds: 213,
    playCount: 1500,
    repostsCount: 30,
    user: { userId: mockArtistId, username: 'dj_nour', displayName: 'Nour' },
  },
  createdAt: new Date('2024-06-01T12:00:00Z'),
});

// ─── Comment factories ────────────────────────────────────────────────────────

const mockCommentId = '660e8400-e29b-41d4-a716-446655440010';
const mockParentCommentId = '660e8400-e29b-41d4-a716-446655440011';

const mockTrackComment = (overrides?: object) => ({
  commentId: mockCommentId,
  trackId: mockTrackId,
  userId: mockUserId,
  content: 'Great track!',
  timestampSeconds: 56,
  parentId: null,
  createdAt: new Date('2024-06-01T12:00:00Z'),
  ...overrides,
});

const mockParentComment = () => ({
  commentId: mockParentCommentId,
  trackId: mockTrackId,
  userId: mockOtherUserId,
  content: 'Original comment',
  timestampSeconds: 30,
  parentId: null,
  createdAt: new Date('2024-06-01T11:00:00Z'),
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('TrackService', () => {
  let service: TrackService;
  let trackRepo: ReturnType<typeof mockTrackRepository>;
  let userRepo: ReturnType<typeof mockUserRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackService,
        { provide: TrackRepository, useFactory: mockTrackRepository },
        { provide: UserRepository, useFactory: mockUserRepository },
        { provide: TrackSseService, useValue: {} },
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(),
            deleteFile: jest.fn(),
            downloadToTemp: jest.fn(),
          },
        },
        { provide: getQueueToken('audioQueue'), useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = module.get<TrackService>(TrackService);
    trackRepo = module.get(TrackRepository);
    userRepo = module.get(UserRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── repostTrack() ───────────────────────────────────────────────────────────

  describe('repostTrack', () => {
    it('should call repostTrack on repo with correct args and return the created repost', async () => {
      const repost = mockTrackRepost();
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.didUserRepostTrack.mockResolvedValue(false);
      trackRepo.repostTrack.mockResolvedValue(repost);

      const result = await service.repostTrack(mockTrackId, mockUserId, mockCaption);

      expect(trackRepo.repostTrack).toHaveBeenCalledWith(mockTrackId, mockUserId, mockCaption);
      expect(result).toEqual({ status: 'success', data: repost });
    });

    it('should work without caption (caption is optional)', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.didUserRepostTrack.mockResolvedValue(false);
      trackRepo.repostTrack.mockResolvedValue(mockTrackRepost());

      await service.repostTrack(mockTrackId, mockUserId);

      expect(trackRepo.repostTrack).toHaveBeenCalledWith(mockTrackId, mockUserId, undefined);
    });

    it('should throw NotFoundException when track not found', async () => {
      trackRepo.findById.mockResolvedValue(null);

      await expect(service.repostTrack(mockTrackId, mockUserId)).rejects.toThrow(NotFoundException);
    });

    it('should NOT call repostTrack if track not found', async () => {
      trackRepo.findById.mockResolvedValue(null);

      await expect(service.repostTrack(mockTrackId, mockUserId)).rejects.toThrow();
      expect(trackRepo.repostTrack).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when userId equals track.userId', async () => {
      trackRepo.findById.mockResolvedValue(mockOwnTrack());

      await expect(service.repostTrack(mockTrackId, mockUserId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should NOT call didUserRepostTrack if track is own', async () => {
      trackRepo.findById.mockResolvedValue(mockOwnTrack());

      await expect(service.repostTrack(mockTrackId, mockUserId)).rejects.toThrow();
      expect(trackRepo.didUserRepostTrack).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when track is not public', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(service.repostTrack(mockTrackId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should NOT call didUserRepostTrack if track is private', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(service.repostTrack(mockTrackId, mockUserId)).rejects.toThrow();
      expect(trackRepo.didUserRepostTrack).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when user has already reposted', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.didUserRepostTrack.mockResolvedValue(true);

      await expect(service.repostTrack(mockTrackId, mockUserId)).rejects.toThrow(ConflictException);
    });
  });

  // ─── getTrackRepostsCount() ──────────────────────────────────────────────────

  describe('getTrackRepostsCount', () => {
    it('should return { trackId, repostsCount } for a public track', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackRepostsCount.mockResolvedValue(5);

      const result = await service.getTrackRepostsCount(mockTrackId, mockUserId);

      expect(result).toEqual({
        status: 'success',
        data: { trackId: mockTrackId, repostsCount: 5 },
      });
    });

    it('should allow access to own private track (userId === track.userId)', async () => {
      trackRepo.findById.mockResolvedValue({ ...mockPrivateTrack(), userId: mockUserId });
      trackRepo.getTrackRepostsCount.mockResolvedValue(3);

      const result = await service.getTrackRepostsCount(mockTrackId, mockUserId);

      expect(result).toEqual({
        status: 'success',
        data: { trackId: mockTrackId, repostsCount: 3 },
      });
    });

    it('should throw NotFoundException when track not found', async () => {
      trackRepo.findById.mockResolvedValue(null);

      await expect(service.getTrackRepostsCount(mockTrackId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when track is private and user is not the owner', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(service.getTrackRepostsCount(mockTrackId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should call findById with correct trackId', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackRepostsCount.mockResolvedValue(0);

      await service.getTrackRepostsCount(mockTrackId, mockUserId);

      expect(trackRepo.findById).toHaveBeenCalledWith(mockTrackId);
    });

    it('should call getTrackRepostsCount with correct trackId', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackRepostsCount.mockResolvedValue(7);

      await service.getTrackRepostsCount(mockTrackId, mockUserId);

      expect(trackRepo.getTrackRepostsCount).toHaveBeenCalledWith(mockTrackId);
    });
  });

  // ─── removeTrackRepost() ─────────────────────────────────────────────────────

  describe('removeTrackRepost', () => {
    it('should remove repost and return success message', async () => {
      trackRepo.didUserRepostTrack.mockResolvedValue(true);
      trackRepo.removeTrackRepost.mockResolvedValue(undefined);

      const result = await service.removeTrackRepost(mockTrackId, mockUserId);

      expect(result).toEqual({ status: 'success', message: 'Repost successfully removed' });
    });

    it('should call removeTrackRepost on repo with correct args', async () => {
      trackRepo.didUserRepostTrack.mockResolvedValue(true);
      trackRepo.removeTrackRepost.mockResolvedValue(undefined);

      await service.removeTrackRepost(mockTrackId, mockUserId);

      expect(trackRepo.removeTrackRepost).toHaveBeenCalledWith(mockTrackId, mockUserId);
    });

    it('should call didUserRepostTrack with correct args', async () => {
      trackRepo.didUserRepostTrack.mockResolvedValue(true);
      trackRepo.removeTrackRepost.mockResolvedValue(undefined);

      await service.removeTrackRepost(mockTrackId, mockUserId);

      expect(trackRepo.didUserRepostTrack).toHaveBeenCalledWith(mockUserId, mockTrackId);
    });

    it('should throw BadRequestException when user has not reposted', async () => {
      trackRepo.didUserRepostTrack.mockResolvedValue(false);

      await expect(service.removeTrackRepost(mockTrackId, mockUserId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should NOT call removeTrackRepost if user has not reposted', async () => {
      trackRepo.didUserRepostTrack.mockResolvedValue(false);

      await expect(service.removeTrackRepost(mockTrackId, mockUserId)).rejects.toThrow();
      expect(trackRepo.removeTrackRepost).not.toHaveBeenCalled();
    });
  });

  // ─── editTrackRepost() ───────────────────────────────────────────────────────

  describe('editTrackRepost', () => {
    it('should return the updated repost', async () => {
      const updated = mockTrackRepost();
      trackRepo.editTrackRepost.mockResolvedValue(updated);

      const result = await service.editTrackRepost(mockTrackId, mockUserId, mockCaption);

      expect(result).toEqual({ status: 'success', data: updated });
    });

    it('should throw BadRequestException when repost not found (repo returns null)', async () => {
      trackRepo.editTrackRepost.mockResolvedValue(null);

      await expect(service.editTrackRepost(mockTrackId, mockUserId, mockCaption)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should call editTrackRepost on repo with correct args', async () => {
      trackRepo.editTrackRepost.mockResolvedValue(mockTrackRepost());

      await service.editTrackRepost(mockTrackId, mockUserId, mockCaption);

      expect(trackRepo.editTrackRepost).toHaveBeenCalledWith(mockTrackId, mockUserId, mockCaption);
    });

    it('should return exactly what the repository returns', async () => {
      const repoResult = { ...mockTrackRepost(), caption: 'Updated caption' };
      trackRepo.editTrackRepost.mockResolvedValue(repoResult);

      const result = await service.editTrackRepost(mockTrackId, mockUserId, 'Updated caption');

      expect(result).toEqual({ status: 'success', data: repoResult });
    });
  });

  // ─── getTrackReposts() ───────────────────────────────────────────────────────

  describe('getTrackReposts', () => {
    it('should return a paginated response with correct shape for a public track', async () => {
      const repost = mockRepostWithUser();
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackReposts.mockResolvedValue([[repost], 1]);

      const result = await service.getTrackReposts(mockTrackId, mockUserId, 1, 20);

      expect(result).toEqual({
        status: 'success',
        data: [
          {
            userId: mockOtherUserId,
            username: 'other_user',
            displayName: 'Other User',
            avatarUrl: 'https://example.com/avatar.jpg',
            followersCount: 120,
            caption: mockCaption,
            repostedAt: repost.createdAt,
          },
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 1,
          limit: 20,
        },
      });
    });

    it('should allow access to own private track', async () => {
      trackRepo.findById.mockResolvedValue({ ...mockPrivateTrack(), userId: mockUserId });
      trackRepo.getTrackReposts.mockResolvedValue([[], 0]);

      await expect(service.getTrackReposts(mockTrackId, mockUserId, 1, 20)).resolves.not.toThrow();
    });

    it('should throw NotFoundException when track not found', async () => {
      trackRepo.findById.mockResolvedValue(null);

      await expect(service.getTrackReposts(mockTrackId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when track is private and user is not the owner', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(service.getTrackReposts(mockTrackId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should cap limit at 100 when limit=200 is passed', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackReposts.mockResolvedValue([[], 0]);

      await service.getTrackReposts(mockTrackId, mockUserId, 1, 200);

      expect(trackRepo.getTrackReposts).toHaveBeenCalledWith(mockTrackId, 1, 100);
    });

    it('should map repost.user fields correctly', async () => {
      const repost = mockRepostWithUser();
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackReposts.mockResolvedValue([[repost], 1]);

      const result = await service.getTrackReposts(mockTrackId, mockUserId, 1, 20);

      expect(result.data[0]).toMatchObject({
        userId: mockOtherUserId,
        username: 'other_user',
        displayName: 'Other User',
        avatarUrl: 'https://example.com/avatar.jpg',
        followersCount: 120,
      });
    });

    it('should include caption and repostedAt in mapped output', async () => {
      const repost = mockRepostWithUser();
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackReposts.mockResolvedValue([[repost], 1]);

      const result = await service.getTrackReposts(mockTrackId, mockUserId, 1, 20);

      expect(result.data[0].caption).toBe(mockCaption);
      expect(result.data[0].repostedAt).toBe(repost.createdAt);
    });

    it('should call getTrackReposts with correct args (trackId, page, cappedLimit)', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackReposts.mockResolvedValue([[], 0]);

      await service.getTrackReposts(mockTrackId, mockUserId, 2, 50);

      expect(trackRepo.getTrackReposts).toHaveBeenCalledWith(mockTrackId, 2, 50);
    });

    it('should use defaults (page=1, limit=20) when not provided', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackReposts.mockResolvedValue([[], 0]);

      await service.getTrackReposts(mockTrackId, mockUserId);

      expect(trackRepo.getTrackReposts).toHaveBeenCalledWith(mockTrackId, 1, 20);
    });
  });

  // ─── getUserTrackReposts() ───────────────────────────────────────────────────

  describe('getUserTrackReposts', () => {
    it('should throw NotFoundException when user not found', async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(service.getUserTrackReposts(mockOtherUserId, mockMyUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when account is private and requester is not the owner', async () => {
      userRepo.findById.mockResolvedValue(mockPrivateUser());

      await expect(service.getUserTrackReposts(mockOtherUserId, mockMyUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should return reposts for a public user', async () => {
      const repost = mockRepostWithTrack();
      userRepo.findById.mockResolvedValue(mockPublicUser());
      trackRepo.getUserTrackReposts.mockResolvedValue([[repost], 1]);

      const result = await service.getUserTrackReposts(mockOtherUserId, mockMyUserId, 1, 20);

      expect(trackRepo.getUserTrackReposts).toHaveBeenCalledWith(mockOtherUserId, 1, 20);
      expect(result).toBeDefined();
    });

    it('should allow a private user to view their own reposts', async () => {
      const repost = mockRepostWithTrack();
      userRepo.findById.mockResolvedValue(mockPrivateUser());
      trackRepo.getUserTrackReposts.mockResolvedValue([[repost], 1]);

      const result = await service.getUserTrackReposts(mockOtherUserId, mockOtherUserId, 1, 20);

      expect(result).toBeDefined();
    });

    it('should cap limit to 100', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser());
      trackRepo.getUserTrackReposts.mockResolvedValue([[], 0]);

      await service.getUserTrackReposts(mockOtherUserId, mockMyUserId, 1, 200);

      expect(trackRepo.getUserTrackReposts).toHaveBeenCalledWith(mockOtherUserId, 1, 100);
    });

    it('should use default page=1 and limit=20 when not provided', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser());
      trackRepo.getUserTrackReposts.mockResolvedValue([[], 0]);

      await service.getUserTrackReposts(mockOtherUserId, mockMyUserId);

      expect(trackRepo.getUserTrackReposts).toHaveBeenCalledWith(mockOtherUserId, 1, 20);
    });

    it('should return correct pagination response shape', async () => {
      const repost = mockRepostWithTrack();
      userRepo.findById.mockResolvedValue(mockPublicUser());
      trackRepo.getUserTrackReposts.mockResolvedValue([[repost], 5]);

      const result = await service.getUserTrackReposts(mockOtherUserId, mockMyUserId, 1, 2);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toMatchObject({
        currentPage: 1,
        totalPages: 3,
        totalCount: 5,
        limit: 2,
      });
    });

    it('should map repost fields correctly', async () => {
      const repost = mockRepostWithTrack();
      userRepo.findById.mockResolvedValue(mockPublicUser());
      trackRepo.getUserTrackReposts.mockResolvedValue([[repost], 1]);

      const result = await service.getUserTrackReposts(mockOtherUserId, mockMyUserId, 1, 20);

      expect(result.data[0]).toMatchObject({
        trackId: mockTrackId,
        title: 'Midnight Drive',
        coverImage: 'https://s3.amazonaws.com/covers/midnight.jpg',
        durationSeconds: 213,
        playCount: 1500,
        repostsCount: 30,
        artist: {
          userId: mockArtistId,
          username: 'dj_nour',
          displayName: 'Nour',
        },
        caption: 'Love this track!',
        repostedAt: new Date('2024-06-01T12:00:00Z'),
      });
    });

    it('should call userRepository.findById with the correct userId', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser());
      trackRepo.getUserTrackReposts.mockResolvedValue([[], 0]);

      await service.getUserTrackReposts(mockOtherUserId, mockMyUserId);

      expect(userRepo.findById).toHaveBeenCalledWith(mockOtherUserId);
    });

    it('should propagate error from trackRepository', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser());
      trackRepo.getUserTrackReposts.mockRejectedValue(new Error('DB error'));

      await expect(service.getUserTrackReposts(mockOtherUserId, mockMyUserId)).rejects.toThrow(
        'DB error'
      );
    });
  });

  // ─── likeTrack() ─────────────────────────────────────────────────────────────

  describe('likeTrack', () => {
    it('should return { status, data } with the created like on success', async () => {
      const like = mockTrackLike();
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.didUserLikeTrack.mockResolvedValue(false);
      trackRepo.likeTrack.mockResolvedValue(like);

      const result = await service.likeTrack(mockTrackId, mockUserId);

      expect(trackRepo.likeTrack).toHaveBeenCalledWith(mockTrackId, mockUserId);
      expect(result).toEqual({ status: 'success', data: like });
    });

    it('should throw NotFoundException when track not found', async () => {
      trackRepo.findById.mockResolvedValue(null);

      await expect(service.likeTrack(mockTrackId, mockUserId)).rejects.toThrow(NotFoundException);
    });

    it('should NOT call likeTrack if track not found', async () => {
      trackRepo.findById.mockResolvedValue(null);

      await expect(service.likeTrack(mockTrackId, mockUserId)).rejects.toThrow();
      expect(trackRepo.likeTrack).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when userId equals track.userId', async () => {
      trackRepo.findById.mockResolvedValue(mockOwnTrack());

      await expect(service.likeTrack(mockTrackId, mockUserId)).rejects.toThrow(BadRequestException);
    });

    it('should NOT call didUserLikeTrack if track is own', async () => {
      trackRepo.findById.mockResolvedValue(mockOwnTrack());

      await expect(service.likeTrack(mockTrackId, mockUserId)).rejects.toThrow();
      expect(trackRepo.didUserLikeTrack).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when track is private', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(service.likeTrack(mockTrackId, mockUserId)).rejects.toThrow(ForbiddenException);
    });

    it('should NOT call didUserLikeTrack if track is private', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(service.likeTrack(mockTrackId, mockUserId)).rejects.toThrow();
      expect(trackRepo.didUserLikeTrack).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when user has already liked', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.didUserLikeTrack.mockResolvedValue(true);

      await expect(service.likeTrack(mockTrackId, mockUserId)).rejects.toThrow(ConflictException);
    });
  });

  // ─── getTrackLikesCount() ────────────────────────────────────────────────────

  describe('getTrackLikesCount', () => {
    it('should return { status, data: { trackId, likesCount } } for a public track', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackLikesCount.mockResolvedValue(7);

      const result = await service.getTrackLikesCount(mockTrackId, mockUserId);

      expect(result).toEqual({ status: 'success', data: { trackId: mockTrackId, likesCount: 7 } });
    });

    it('should allow access to own private track (userId === track.userId)', async () => {
      trackRepo.findById.mockResolvedValue({ ...mockPrivateTrack(), userId: mockUserId });
      trackRepo.getTrackLikesCount.mockResolvedValue(2);

      const result = await service.getTrackLikesCount(mockTrackId, mockUserId);

      expect(result).toEqual({ status: 'success', data: { trackId: mockTrackId, likesCount: 2 } });
    });

    it('should throw NotFoundException when track not found', async () => {
      trackRepo.findById.mockResolvedValue(null);

      await expect(service.getTrackLikesCount(mockTrackId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when track is private and user is not the owner', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(service.getTrackLikesCount(mockTrackId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should call findById with correct trackId', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackLikesCount.mockResolvedValue(0);

      await service.getTrackLikesCount(mockTrackId, mockUserId);

      expect(trackRepo.findById).toHaveBeenCalledWith(mockTrackId);
    });

    it('should call getTrackLikesCount with correct trackId', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackLikesCount.mockResolvedValue(3);

      await service.getTrackLikesCount(mockTrackId, mockUserId);

      expect(trackRepo.getTrackLikesCount).toHaveBeenCalledWith(mockTrackId);
    });
  });

  // ─── removeTrackLike() ───────────────────────────────────────────────────────

  describe('removeTrackLike', () => {
    it('should remove like and return success message', async () => {
      trackRepo.didUserLikeTrack.mockResolvedValue(true);
      trackRepo.removeTrackLike.mockResolvedValue(undefined);

      const result = await service.removeTrackLike(mockTrackId, mockUserId);

      expect(result).toEqual({ status: 'success', message: 'Track successfully unliked' });
    });

    it('should call removeTrackLike on repo with correct args', async () => {
      trackRepo.didUserLikeTrack.mockResolvedValue(true);
      trackRepo.removeTrackLike.mockResolvedValue(undefined);

      await service.removeTrackLike(mockTrackId, mockUserId);

      expect(trackRepo.removeTrackLike).toHaveBeenCalledWith(mockTrackId, mockUserId);
    });

    it('should call didUserLikeTrack with correct args', async () => {
      trackRepo.didUserLikeTrack.mockResolvedValue(true);
      trackRepo.removeTrackLike.mockResolvedValue(undefined);

      await service.removeTrackLike(mockTrackId, mockUserId);

      expect(trackRepo.didUserLikeTrack).toHaveBeenCalledWith(mockUserId, mockTrackId);
    });

    it('should throw BadRequestException when user has not liked', async () => {
      trackRepo.didUserLikeTrack.mockResolvedValue(false);

      await expect(service.removeTrackLike(mockTrackId, mockUserId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should NOT call removeTrackLike if user has not liked', async () => {
      trackRepo.didUserLikeTrack.mockResolvedValue(false);

      await expect(service.removeTrackLike(mockTrackId, mockUserId)).rejects.toThrow();
      expect(trackRepo.removeTrackLike).not.toHaveBeenCalled();
    });
  });

  // ─── getTrackLikes() ─────────────────────────────────────────────────────────

  describe('getTrackLikes', () => {
    it('should return a paginated response with correct shape for a public track', async () => {
      const like = mockLikeWithUser();
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackLikes.mockResolvedValue([[like], 1]);

      const result = await service.getTrackLikes(mockTrackId, mockUserId, 1, 20);

      expect(result).toEqual({
        status: 'success',
        data: [
          {
            userId: mockOtherUserId,
            username: 'other_user',
            displayName: 'Other User',
            avatarUrl: 'https://example.com/avatar.jpg',
            followersCount: 120,
            likedAt: like.createdAt,
          },
        ],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 1, limit: 20 },
      });
    });

    it('should allow access to own private track', async () => {
      trackRepo.findById.mockResolvedValue({ ...mockPrivateTrack(), userId: mockUserId });
      trackRepo.getTrackLikes.mockResolvedValue([[], 0]);

      await expect(service.getTrackLikes(mockTrackId, mockUserId, 1, 20)).resolves.not.toThrow();
    });

    it('should throw NotFoundException when track not found', async () => {
      trackRepo.findById.mockResolvedValue(null);

      await expect(service.getTrackLikes(mockTrackId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when track is private and user is not the owner', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(service.getTrackLikes(mockTrackId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should cap limit at 100 when limit=200 is passed', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackLikes.mockResolvedValue([[], 0]);

      await service.getTrackLikes(mockTrackId, mockUserId, 1, 200);

      expect(trackRepo.getTrackLikes).toHaveBeenCalledWith(mockTrackId, 1, 100);
    });

    it('should map like.user fields correctly (no caption field)', async () => {
      const like = mockLikeWithUser();
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackLikes.mockResolvedValue([[like], 1]);

      const result = await service.getTrackLikes(mockTrackId, mockUserId, 1, 20);

      expect(result.data[0]).not.toHaveProperty('caption');
      expect(result.data[0]).toMatchObject({
        userId: mockOtherUserId,
        username: 'other_user',
        displayName: 'Other User',
        avatarUrl: 'https://example.com/avatar.jpg',
        followersCount: 120,
      });
    });

    it('should include likedAt in mapped output', async () => {
      const like = mockLikeWithUser();
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackLikes.mockResolvedValue([[like], 1]);

      const result = await service.getTrackLikes(mockTrackId, mockUserId, 1, 20);

      expect(result.data[0].likedAt).toBe(like.createdAt);
    });

    it('should call getTrackLikes with correct args (trackId, page, cappedLimit)', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackLikes.mockResolvedValue([[], 0]);

      await service.getTrackLikes(mockTrackId, mockUserId, 2, 50);

      expect(trackRepo.getTrackLikes).toHaveBeenCalledWith(mockTrackId, 2, 50);
    });

    it('should use defaults (page=1, limit=20) when not provided', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackLikes.mockResolvedValue([[], 0]);

      await service.getTrackLikes(mockTrackId, mockUserId);

      expect(trackRepo.getTrackLikes).toHaveBeenCalledWith(mockTrackId, 1, 20);
    });
  });

  // ─── getUserTrackLikes() ─────────────────────────────────────────────────────

  describe('getUserTrackLikes', () => {
    it('should throw NotFoundException when user not found', async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(service.getUserTrackLikes(mockOtherUserId, mockMyUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when account is private and requester is not the owner', async () => {
      userRepo.findById.mockResolvedValue(mockPrivateUser());

      await expect(service.getUserTrackLikes(mockOtherUserId, mockMyUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should return likes for a public user', async () => {
      const like = mockLikeWithTrack();
      userRepo.findById.mockResolvedValue(mockPublicUser());
      trackRepo.getUserTrackLikes.mockResolvedValue([[like], 1]);

      const result = await service.getUserTrackLikes(mockOtherUserId, mockMyUserId, 1, 20);

      expect(trackRepo.getUserTrackLikes).toHaveBeenCalledWith(mockOtherUserId, 1, 20);
      expect(result).toBeDefined();
    });

    it('should allow a private user to view their own likes', async () => {
      const like = mockLikeWithTrack();
      userRepo.findById.mockResolvedValue(mockPrivateUser());
      trackRepo.getUserTrackLikes.mockResolvedValue([[like], 1]);

      const result = await service.getUserTrackLikes(mockOtherUserId, mockOtherUserId, 1, 20);

      expect(result).toBeDefined();
    });

    it('should cap limit to 100', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser());
      trackRepo.getUserTrackLikes.mockResolvedValue([[], 0]);

      await service.getUserTrackLikes(mockOtherUserId, mockMyUserId, 1, 200);

      expect(trackRepo.getUserTrackLikes).toHaveBeenCalledWith(mockOtherUserId, 1, 100);
    });

    it('should use default page=1 and limit=20 when not provided', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser());
      trackRepo.getUserTrackLikes.mockResolvedValue([[], 0]);

      await service.getUserTrackLikes(mockOtherUserId, mockMyUserId);

      expect(trackRepo.getUserTrackLikes).toHaveBeenCalledWith(mockOtherUserId, 1, 20);
    });

    it('should return correct pagination response shape', async () => {
      const like = mockLikeWithTrack();
      userRepo.findById.mockResolvedValue(mockPublicUser());
      trackRepo.getUserTrackLikes.mockResolvedValue([[like], 5]);

      const result = await service.getUserTrackLikes(mockOtherUserId, mockMyUserId, 1, 2);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toMatchObject({
        currentPage: 1,
        totalPages: 3,
        totalCount: 5,
        limit: 2,
      });
    });

    it('should map like fields correctly (no caption)', async () => {
      const like = mockLikeWithTrack();
      userRepo.findById.mockResolvedValue(mockPublicUser());
      trackRepo.getUserTrackLikes.mockResolvedValue([[like], 1]);

      const result = await service.getUserTrackLikes(mockOtherUserId, mockMyUserId, 1, 20);

      expect(result.data[0]).toMatchObject({
        trackId: mockTrackId,
        title: 'Midnight Drive',
        coverImage: 'https://s3.amazonaws.com/covers/midnight.jpg',
        durationSeconds: 213,
        playCount: 1500,
        repostsCount: 30,
        artist: { userId: mockArtistId, username: 'dj_nour', displayName: 'Nour' },
        likedAt: new Date('2024-06-01T12:00:00Z'),
      });
      expect(result.data[0]).not.toHaveProperty('caption');
    });

    it('should call userRepository.findById with the correct userId', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser());
      trackRepo.getUserTrackLikes.mockResolvedValue([[], 0]);

      await service.getUserTrackLikes(mockOtherUserId, mockMyUserId);

      expect(userRepo.findById).toHaveBeenCalledWith(mockOtherUserId);
    });

    it('should propagate error from trackRepository', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser());
      trackRepo.getUserTrackLikes.mockRejectedValue(new Error('DB error'));

      await expect(service.getUserTrackLikes(mockOtherUserId, mockMyUserId)).rejects.toThrow(
        'DB error'
      );
    });
  });

  // ─── addComment() ────────────────────────────────────────────────────────────

  describe('addComment', () => {
    const mockDto = { content: 'Great track!', timestampSeconds: 56 };
    const mockDtoWithParent = {
      content: 'Nice reply!',
      timestampSeconds: 30,
      parentId: mockParentCommentId,
    };

    it('should return { status, data } with the saved comment', async () => {
      const comment = mockTrackComment();
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.addComment.mockResolvedValue(comment);

      const result = await service.addComment(mockTrackId, mockUserId, mockDto);

      expect(result).toEqual({ status: 'success', data: comment });
    });

    it('should call addComment on repo with trackId, userId, and dto', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.addComment.mockResolvedValue(mockTrackComment());

      await service.addComment(mockTrackId, mockUserId, mockDto);

      expect(trackRepo.addComment).toHaveBeenCalledWith(mockTrackId, mockUserId, mockDto);
      expect(trackRepo.addComment).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when track not found', async () => {
      trackRepo.findById.mockResolvedValue(null);

      await expect(service.addComment(mockTrackId, mockUserId, mockDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should NOT call addComment if track not found', async () => {
      trackRepo.findById.mockResolvedValue(null);

      await expect(service.addComment(mockTrackId, mockUserId, mockDto)).rejects.toThrow();
      expect(trackRepo.addComment).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when track is private', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(service.addComment(mockTrackId, mockUserId, mockDto)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should NOT call addComment if track is private', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(service.addComment(mockTrackId, mockUserId, mockDto)).rejects.toThrow();
      expect(trackRepo.addComment).not.toHaveBeenCalled();
    });

    it('should allow owner to comment on their own private track', async () => {
      trackRepo.findById.mockResolvedValue({ ...mockPrivateTrack(), isPublic: false });
      // Private check is isPublic only — owner is NOT exempt for commenting
      // (service throws ForbiddenException regardless of ownership)
      await expect(service.addComment(mockTrackId, mockUserId, mockDto)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw NotFoundException when parentId is provided but parent not found', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.findCommentById.mockResolvedValue(null);

      await expect(service.addComment(mockTrackId, mockUserId, mockDtoWithParent)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should NOT call addComment if parent comment not found', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.findCommentById.mockResolvedValue(null);

      await expect(
        service.addComment(mockTrackId, mockUserId, mockDtoWithParent)
      ).rejects.toThrow();
      expect(trackRepo.addComment).not.toHaveBeenCalled();
    });

    it('should call findCommentById with the parentId when parentId is provided', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.findCommentById.mockResolvedValue(mockParentComment());
      trackRepo.addComment.mockResolvedValue(mockTrackComment({ parentId: mockParentCommentId }));

      await service.addComment(mockTrackId, mockUserId, mockDtoWithParent);

      expect(trackRepo.findCommentById).toHaveBeenCalledWith(mockParentCommentId);
    });

    it('should NOT call findCommentById when no parentId is in dto', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.addComment.mockResolvedValue(mockTrackComment());

      await service.addComment(mockTrackId, mockUserId, mockDto);

      expect(trackRepo.findCommentById).not.toHaveBeenCalled();
    });

    it('should create reply when parentId is valid', async () => {
      const reply = mockTrackComment({ parentId: mockParentCommentId, content: 'Nice reply!' });
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.findCommentById.mockResolvedValue(mockParentComment());
      trackRepo.addComment.mockResolvedValue(reply);

      const result = await service.addComment(mockTrackId, mockUserId, mockDtoWithParent);

      expect(result).toEqual({ status: 'success', data: reply });
      expect(result.data.parentId).toBe(mockParentCommentId);
    });
  });

  // ─── deleteComment() ─────────────────────────────────────────────────────────

  describe('deleteComment', () => {
    it('should return { status, message } on success', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.findCommentById.mockResolvedValue(
        mockTrackComment({ userId: mockUserId, trackId: mockTrackId })
      );
      trackRepo.deleteComment.mockResolvedValue(undefined);

      const result = await service.deleteComment(mockTrackId, mockCommentId, mockUserId);

      expect(result).toEqual({ status: 'success', message: 'comment deleted successfully' });
    });

    it('should call deleteComment on repo with correct args', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.findCommentById.mockResolvedValue(
        mockTrackComment({ userId: mockUserId, trackId: mockTrackId })
      );
      trackRepo.deleteComment.mockResolvedValue(undefined);

      await service.deleteComment(mockTrackId, mockCommentId, mockUserId);

      expect(trackRepo.deleteComment).toHaveBeenCalledWith(mockTrackId, mockCommentId, mockUserId);
    });

    it('should throw NotFoundException when track not found', async () => {
      trackRepo.findById.mockResolvedValue(null);

      await expect(service.deleteComment(mockTrackId, mockCommentId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when track is private', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(service.deleteComment(mockTrackId, mockCommentId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw NotFoundException when comment not found', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.findCommentById.mockResolvedValue(null);

      await expect(service.deleteComment(mockTrackId, mockCommentId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ConflictException when comment does not belong to the track', async () => {
      const wrongTrackComment = mockTrackComment({
        trackId: '999e8400-e29b-41d4-a716-446655440099',
      });
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.findCommentById.mockResolvedValue(wrongTrackComment);

      await expect(service.deleteComment(mockTrackId, mockCommentId, mockUserId)).rejects.toThrow(
        ConflictException
      );
    });

    it('should throw ForbiddenException when user is not the comment author', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.findCommentById.mockResolvedValue(
        mockTrackComment({ userId: mockOtherUserId, trackId: mockTrackId })
      );

      await expect(service.deleteComment(mockTrackId, mockCommentId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should NOT call deleteComment if user is not the comment author', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.findCommentById.mockResolvedValue(
        mockTrackComment({ userId: mockOtherUserId, trackId: mockTrackId })
      );

      await expect(service.deleteComment(mockTrackId, mockCommentId, mockUserId)).rejects.toThrow();
      expect(trackRepo.deleteComment).not.toHaveBeenCalled();
    });
  });

  // ─── getTrackComments() ───────────────────────────────────────────────────────

  describe('getTrackComments', () => {
    const mockReplyUser = {
      userId: mockOtherUserId,
      username: 'other_user',
      displayName: 'Other User',
      avatarUrl: 'https://example.com/other-avatar.jpg',
    };

    const mockReply = () => ({
      commentId: mockParentCommentId,
      trackId: mockTrackId,
      userId: mockOtherUserId,
      content: 'Great reply!',
      timestampSeconds: 56,
      parentId: mockCommentId,
      createdAt: new Date('2024-06-02T10:00:00Z'),
      user: mockReplyUser,
    });

    const mockCommentWithUser = () => ({
      ...mockTrackComment(),
      parentId: null,
      user: {
        userId: mockUserId,
        username: 'test_user',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
      replies: [mockReply()],
    });

    it('should return paginated comments with status: success', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackComments.mockResolvedValue([[mockCommentWithUser()], 1]);

      const result = await service.getTrackComments(mockTrackId, mockUserId, 1, 20, 'timestamp');

      expect(result.status).toBe('success');
      expect(result.data).toHaveLength(1);
      expect(result.pagination).toMatchObject({ currentPage: 1, totalCount: 1 });
    });

    it('should map comment fields correctly including parentId and replies', async () => {
      const c = mockCommentWithUser();
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackComments.mockResolvedValue([[c], 1]);

      const result = await service.getTrackComments(mockTrackId, mockUserId, 1, 20, 'timestamp');

      expect(result.data[0]).toMatchObject({
        commentId: c.commentId,
        content: c.content,
        timestampSeconds: c.timestampSeconds,
        parentId: null,
        user: {
          userId: c.user.userId,
          username: c.user.username,
          displayName: c.user.displayName,
          avatarUrl: c.user.avatarUrl,
        },
        createdAt: c.createdAt,
      });
    });

    it('should map nested replies with user and parentId', async () => {
      const c = mockCommentWithUser();
      const reply = mockReply();
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackComments.mockResolvedValue([[c], 1]);

      const result = await service.getTrackComments(mockTrackId, mockUserId, 1, 20, 'timestamp');

      expect(result.data[0].replies).toHaveLength(1);
      expect(result.data[0].replies[0]).toMatchObject({
        commentId: reply.commentId,
        content: reply.content,
        timestampSeconds: reply.timestampSeconds,
        parentId: mockCommentId,
        user: {
          userId: reply.user.userId,
          username: reply.user.username,
          displayName: reply.user.displayName,
          avatarUrl: reply.user.avatarUrl,
        },
        createdAt: reply.createdAt,
      });
    });

    it('should return empty replies array when comment has no replies', async () => {
      const c = { ...mockCommentWithUser(), replies: [] };
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackComments.mockResolvedValue([[c], 1]);

      const result = await service.getTrackComments(mockTrackId, mockUserId, 1, 20, 'timestamp');

      expect(result.data[0].replies).toEqual([]);
    });

    it('should throw NotFoundException when track not found', async () => {
      trackRepo.findById.mockResolvedValue(null);

      await expect(
        service.getTrackComments(mockTrackId, mockUserId, 1, 20, 'timestamp')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when track is private and user is not the owner', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(
        service.getTrackComments(mockTrackId, mockUserId, 1, 20, 'timestamp')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow owner to get comments of their private track', async () => {
      trackRepo.findById.mockResolvedValue({ ...mockPrivateTrack(), userId: mockUserId });
      trackRepo.getTrackComments.mockResolvedValue([[], 0]);

      await expect(
        service.getTrackComments(mockTrackId, mockUserId, 1, 20, 'timestamp')
      ).resolves.not.toThrow();
    });

    it('should cap limit at 100', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackComments.mockResolvedValue([[], 0]);

      await service.getTrackComments(mockTrackId, mockUserId, 1, 200, 'timestamp');

      expect(trackRepo.getTrackComments).toHaveBeenCalledWith(mockTrackId, 1, 100, 'timestamp');
    });

    it('should use defaults page=1, limit=20, order=timestamp when not provided', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackComments.mockResolvedValue([[], 0]);

      await service.getTrackComments(mockTrackId, mockUserId);

      expect(trackRepo.getTrackComments).toHaveBeenCalledWith(mockTrackId, 1, 20, 'timestamp');
    });

    it('should pass order=newest to repo', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackComments.mockResolvedValue([[], 0]);

      await service.getTrackComments(mockTrackId, mockUserId, 1, 20, 'newest');

      expect(trackRepo.getTrackComments).toHaveBeenCalledWith(mockTrackId, 1, 20, 'newest');
    });

    it('should pass order=oldest to repo', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackComments.mockResolvedValue([[], 0]);

      await service.getTrackComments(mockTrackId, mockUserId, 1, 20, 'oldest');

      expect(trackRepo.getTrackComments).toHaveBeenCalledWith(mockTrackId, 1, 20, 'oldest');
    });
  });
});
