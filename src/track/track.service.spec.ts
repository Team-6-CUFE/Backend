import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TrackService } from './track.service';
import { TrackRepository } from './track.repository';
import { UserRepository } from '../user/user.repository';

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
});

const mockUserRepository = () => ({
  findById: jest.fn(),
});

const mockPublicTrack = () => ({ trackId: mockTrackId, userId: mockOtherUserId, isPublic: true });
const mockPrivateTrack = () => ({ trackId: mockTrackId, userId: mockOtherUserId, isPublic: false });
const mockOwnTrack = () => ({ trackId: mockTrackId, userId: mockUserId, isPublic: true });
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
});
