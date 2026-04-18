import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { PlaylistRepository } from './playlist.repository';
import { UserRepository } from '../user/user.repository';
import { StorageService } from '../common/storage_service';
import { PlaylistService } from './playlist.service';
import { ActivityService } from '../activity/activity.service';

// ─── Constants ────────────────────────────────────────────────────────────────

jest.mock('sharp', () => () => ({
  resize: jest.fn().mockReturnThis(),
  webp: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('ok')),
}));

const mockPlaylistId = '550e8400-e29b-41d4-a716-446655440000';
const mockUserId = '550e8400-e29b-41d4-a716-446655440001';
const mockOwnerId = '550e8400-e29b-41d4-a716-446655440002';
const mockOtherUserId = '550e8400-e29b-41d4-a716-446655440003';
const mockMyUserId = '550e8400-e29b-41d4-a716-446655440004';

// ─── Mock factories ───────────────────────────────────────────────────────────

const mockPlaylistRepository = () => ({
  findPlaylistById: jest.fn(),
  findRepostByUserAndPlaylist: jest.fn(),
  createRepost: jest.fn(),
  removeRepost: jest.fn(),
  getPlaylistReposters: jest.fn(),
  getUserPlaylistReposts: jest.fn(),
  findLikeByUserAndPlaylist: jest.fn(),
  createLike: jest.fn(),
  removeLike: jest.fn(),
  getPlaylistLikes: jest.fn(),
  getUserPlaylistLikes: jest.fn(),
  updatePlaylist: jest.fn(),
  findTrackById: jest.fn(),
  updatePlaylistStats: jest.fn(),
  addTrackToPlaylist: jest.fn(),
  findMaxPosition: jest.fn(),
  findTrackInPlaylist: jest.fn(),
  removeTrackAndReorder: jest.fn(),
  deletePlaylist: jest.fn(),
  getPlaylistDetails: jest.fn(),
  findAllTrackIdsInPlaylist: jest.fn(),
  reorderTracks: jest.fn(),
  createPlaylist: jest.fn(),
  getPublicPlaylist: jest.fn(),
  getSecretPlaylist: jest.fn(),
  changePlaylistPrivacy: jest.fn(),
  resetSecretToken: jest.fn(),
  findOrCreateGenre: jest.fn(),
  updatePlaylistTags: jest.fn(),
  updatePlaylistGenre: jest.fn(),
  getPlaylistWithTagsandGenre: jest.fn(),
  getMyPlaylists: jest.fn(),
  getUserPlaylists: jest.fn(),
});

const mockStorageService = () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
});

const mockUserRepository = () => ({
  findById: jest.fn(),
});

const mockActivitiesService = () => ({
  createActivity: jest.fn(),
});

const mockPublicPlaylist = () => ({
  playlistId: mockPlaylistId,
  userId: mockOwnerId,
  isPublic: true,
  repostsCount: 42,
});

const mockPrivatePlaylist = () => ({
  playlistId: mockPlaylistId,
  userId: mockOwnerId,
  isPublic: false,
  repostsCount: 0,
});

const mockOwnPlaylist = () => ({
  playlistId: mockPlaylistId,
  userId: mockUserId,
  isPublic: true,
  repostsCount: 5,
});

const mockRepostRecord = () => ({
  playlistId: mockPlaylistId,
  userId: mockUserId,
  createdAt: new Date('2024-06-01T12:00:00Z'),
});

const mockReposterEntry = () => ({
  user: {
    userId: mockOtherUserId,
    username: 'other_user',
    displayName: 'Other User',
    avatarUrl: 'https://example.com/avatar.jpg',
  },
  createdAt: new Date('2024-06-01T12:00:00Z'),
});

const mockRepostWithPlaylist = () => ({
  playlistId: mockPlaylistId,
  createdAt: new Date('2024-06-01T12:00:00Z'),
  playlist: {
    title: 'Summer Hits',
    coverImage: 'https://example.com/cover.jpg',
    isPublic: true,
    tracksCount: 5,
    likesCount: 150,
    repostsCount: 12,
    user: {
      userId: mockOwnerId,
      username: 'playlist_creator',
      displayName: 'The Creator',
    },
  },
});

const mockPublicUser = () => ({ userId: mockOtherUserId, isPublic: true });
const mockPrivateUser = () => ({ userId: mockOtherUserId, isPublic: false });

const mockPublicPlaylistWithLikes = () => ({
  playlistId: mockPlaylistId,
  userId: mockOwnerId,
  isPublic: true,
  likesCount: 17,
});

const mockLikeRecord = () => ({
  playlistId: mockPlaylistId,
  userId: mockUserId,
  createdAt: new Date('2024-06-01T12:00:00Z'),
});

const mockLikerEntry = () => ({
  user: {
    userId: mockOtherUserId,
    username: 'other_user',
    displayName: 'Other User',
    avatarUrl: 'https://example.com/avatar.jpg',
    followersCount: 120,
  },
  createdAt: new Date('2024-06-01T12:00:00Z'),
});

const mockLikeWithPlaylist = () => ({
  playlistId: mockPlaylistId,
  createdAt: new Date('2024-06-01T12:00:00Z'),
  playlist: {
    title: 'Summer Hits',
    coverImage: 'https://example.com/cover.jpg',
    isPublic: true,
    tracksCount: 5,
    likesCount: 150,
    repostsCount: 12,
    user: {
      userId: mockOwnerId,
      username: 'playlist_creator',
      displayName: 'The Creator',
    },
  },
});

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('PlaylistService', () => {
  let service: PlaylistService;
  let playlistRepo: ReturnType<typeof mockPlaylistRepository>;
  let userRepo: ReturnType<typeof mockUserRepository>;
  let storageService: ReturnType<typeof mockStorageService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaylistService,
        { provide: PlaylistRepository, useFactory: mockPlaylistRepository },
        { provide: UserRepository, useFactory: mockUserRepository },
        { provide: StorageService, useFactory: mockStorageService },
        { provide: ActivityService, useFactory: mockActivitiesService },
      ],
    }).compile();

    service = module.get(PlaylistService);
    playlistRepo = module.get(PlaylistRepository);
    userRepo = module.get(UserRepository);
    storageService = module.get(StorageService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── repostPlaylist() ─────────────────────────────────────────────────────

  describe('repostPlaylist', () => {
    it('should return { status, data: { userId, playlistId, repostedAt } } on success', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.findRepostByUserAndPlaylist.mockResolvedValue(null);
      playlistRepo.createRepost.mockResolvedValue(undefined);

      const result = await service.repostPlaylist(mockPlaylistId, mockUserId);

      expect(result.status).toBe('success');
      expect(result.data.userId).toBe(mockUserId);
      expect(result.data.playlistId).toBe(mockPlaylistId);
      expect(result.data.repostedAt).toBeInstanceOf(Date);
    });

    it('should call createRepost with correct args', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.findRepostByUserAndPlaylist.mockResolvedValue(null);
      playlistRepo.createRepost.mockResolvedValue(undefined);

      await service.repostPlaylist(mockPlaylistId, mockUserId);

      expect(playlistRepo.createRepost).toHaveBeenCalledWith(mockUserId, mockPlaylistId);
      expect(playlistRepo.createRepost).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when playlist not found', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(null);

      await expect(service.repostPlaylist(mockPlaylistId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should NOT check duplicate before existence', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(null);

      await expect(service.repostPlaylist(mockPlaylistId, mockUserId)).rejects.toThrow();
      expect(playlistRepo.findRepostByUserAndPlaylist).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when playlist is private', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPrivatePlaylist());

      await expect(service.repostPlaylist(mockPlaylistId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw ForbiddenException for private playlist BEFORE checking duplicate', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPrivatePlaylist());

      await expect(service.repostPlaylist(mockPlaylistId, mockUserId)).rejects.toThrow();
      expect(playlistRepo.findRepostByUserAndPlaylist).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when user is the owner', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockOwnPlaylist());

      await expect(service.repostPlaylist(mockPlaylistId, mockUserId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException for own playlist BEFORE checking duplicate', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockOwnPlaylist());

      await expect(service.repostPlaylist(mockPlaylistId, mockUserId)).rejects.toThrow();
      expect(playlistRepo.findRepostByUserAndPlaylist).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when already reposted', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.findRepostByUserAndPlaylist.mockResolvedValue(mockRepostRecord());

      await expect(service.repostPlaylist(mockPlaylistId, mockUserId)).rejects.toThrow(
        ConflictException
      );
    });

    it('should NOT call createRepost when already reposted', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.findRepostByUserAndPlaylist.mockResolvedValue(mockRepostRecord());

      await expect(service.repostPlaylist(mockPlaylistId, mockUserId)).rejects.toThrow();
      expect(playlistRepo.createRepost).not.toHaveBeenCalled();
    });
  });

  // ─── removeRepost() ───────────────────────────────────────────────────────

  describe('removeRepost', () => {
    it('should return { status, message } on success', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.findRepostByUserAndPlaylist.mockResolvedValue(mockRepostRecord());
      playlistRepo.removeRepost.mockResolvedValue(undefined);

      const result = await service.removeRepost(mockPlaylistId, mockUserId);

      expect(result).toEqual({
        status: 'success',
        message: 'Playlist repost successfully removed',
      });
    });

    it('should call removeRepost on repo with correct args', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.findRepostByUserAndPlaylist.mockResolvedValue(mockRepostRecord());
      playlistRepo.removeRepost.mockResolvedValue(undefined);

      await service.removeRepost(mockPlaylistId, mockUserId);

      expect(playlistRepo.removeRepost).toHaveBeenCalledWith(mockUserId, mockPlaylistId);
    });

    it('should throw NotFoundException when playlist not found', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(null);

      await expect(service.removeRepost(mockPlaylistId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when user has not reposted', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.findRepostByUserAndPlaylist.mockResolvedValue(null);

      await expect(service.removeRepost(mockPlaylistId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should NOT call removeRepost on repo when repost not found', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.findRepostByUserAndPlaylist.mockResolvedValue(null);

      await expect(service.removeRepost(mockPlaylistId, mockUserId)).rejects.toThrow();
      expect(playlistRepo.removeRepost).not.toHaveBeenCalled();
    });
  });

  // ─── getRepostsCount() ────────────────────────────────────────────────────

  describe('getRepostsCount', () => {
    it('should return { status, data: { playlistId, repostCount } }', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());

      const result = await service.getRepostsCount(mockPlaylistId);

      expect(result).toEqual({
        status: 'success',
        data: { playlistId: mockPlaylistId, repostCount: 42 },
      });
    });

    it('should throw NotFoundException when playlist not found', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(null);

      await expect(service.getRepostsCount(mockPlaylistId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when playlist is private', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPrivatePlaylist());

      await expect(service.getRepostsCount(mockPlaylistId)).rejects.toThrow(ForbiddenException);
    });

    it('should use repostsCount from the playlist entity', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({ ...mockPublicPlaylist(), repostsCount: 7 });

      const result = await service.getRepostsCount(mockPlaylistId);

      expect(result.data.repostCount).toBe(7);
    });
  });

  // ─── getPlaylistReposters() ───────────────────────────────────────────────

  describe('getPlaylistReposters', () => {
    it('should return paginated reposters with status: success', async () => {
      const reposter = mockReposterEntry();
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.getPlaylistReposters.mockResolvedValue([[reposter], 1]);

      const result = await service.getPlaylistReposters(mockPlaylistId, mockUserId, 1, 20);

      expect(result.status).toBe('success');
      expect(result.data).toHaveLength(1);
      expect(result.pagination).toMatchObject({ currentPage: 1, totalCount: 1 });
    });

    it('should throw NotFoundException when playlist not found', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(null);

      await expect(service.getPlaylistReposters(mockPlaylistId, mockUserId, 1, 20)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when playlist is private and user is not owner', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPrivatePlaylist());

      await expect(service.getPlaylistReposters(mockPlaylistId, mockUserId, 1, 20)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should allow owner to view reposters of their own private playlist', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({
        ...mockPrivatePlaylist(),
        userId: mockUserId,
      });
      playlistRepo.getPlaylistReposters.mockResolvedValue([[], 0]);

      await expect(
        service.getPlaylistReposters(mockPlaylistId, mockUserId, 1, 20)
      ).resolves.not.toThrow();
    });

    it('should cap limit at 100', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.getPlaylistReposters.mockResolvedValue([[], 0]);

      await service.getPlaylistReposters(mockPlaylistId, mockUserId, 1, 200);

      expect(playlistRepo.getPlaylistReposters).toHaveBeenCalledWith(mockPlaylistId, 1, 100);
    });

    it('should use defaults page=1, limit=20 when not provided', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.getPlaylistReposters.mockResolvedValue([[], 0]);

      await service.getPlaylistReposters(mockPlaylistId, mockUserId);

      expect(playlistRepo.getPlaylistReposters).toHaveBeenCalledWith(mockPlaylistId, 1, 20);
    });

    it('should map reposter fields correctly', async () => {
      const reposter = mockReposterEntry();
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.getPlaylistReposters.mockResolvedValue([[reposter], 1]);

      const result = await service.getPlaylistReposters(mockPlaylistId, mockUserId, 1, 20);

      expect(result.data[0]).toMatchObject({
        userId: mockOtherUserId,
        username: 'other_user',
        displayName: 'Other User',
        avatarUrl: 'https://example.com/avatar.jpg',
        repostedAt: reposter.createdAt,
      });
    });
  });

  // ─── getUserPlaylistReposts() ─────────────────────────────────────────────

  describe('getUserPlaylistReposts', () => {
    it('should return paginated reposts with status: success', async () => {
      const repost = mockRepostWithPlaylist();
      userRepo.findById.mockResolvedValue(mockPublicUser());
      playlistRepo.getUserPlaylistReposts.mockResolvedValue([[repost], 1]);

      const result = await service.getUserPlaylistReposts(mockOtherUserId, mockMyUserId, 1, 20);

      expect(result.status).toBe('success');
      expect(result.data).toHaveLength(1);
      expect(result.pagination).toMatchObject({ currentPage: 1, totalCount: 1 });
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(service.getUserPlaylistReposts(mockOtherUserId, mockMyUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when account is private and requester is not the owner', async () => {
      userRepo.findById.mockResolvedValue(mockPrivateUser());

      await expect(service.getUserPlaylistReposts(mockOtherUserId, mockMyUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should allow a private user to view their own reposts', async () => {
      userRepo.findById.mockResolvedValue(mockPrivateUser());
      playlistRepo.getUserPlaylistReposts.mockResolvedValue([[], 0]);

      await expect(
        service.getUserPlaylistReposts(mockOtherUserId, mockOtherUserId)
      ).resolves.not.toThrow();
    });

    it('should cap limit at 100', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser());
      playlistRepo.getUserPlaylistReposts.mockResolvedValue([[], 0]);

      await service.getUserPlaylistReposts(mockOtherUserId, mockMyUserId, 1, 200);

      expect(playlistRepo.getUserPlaylistReposts).toHaveBeenCalledWith(mockOtherUserId, 1, 100);
    });

    it('should use defaults page=1, limit=20 when not provided', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser());
      playlistRepo.getUserPlaylistReposts.mockResolvedValue([[], 0]);

      await service.getUserPlaylistReposts(mockOtherUserId, mockMyUserId);

      expect(playlistRepo.getUserPlaylistReposts).toHaveBeenCalledWith(mockOtherUserId, 1, 20);
    });

    it('should map repost fields correctly', async () => {
      const repost = mockRepostWithPlaylist();
      userRepo.findById.mockResolvedValue(mockPublicUser());
      playlistRepo.getUserPlaylistReposts.mockResolvedValue([[repost], 1]);

      const result = await service.getUserPlaylistReposts(mockOtherUserId, mockMyUserId, 1, 20);

      expect(result.data[0]).toMatchObject({
        playlistId: mockPlaylistId,
        title: 'Summer Hits',
        coverImage: 'https://example.com/cover.jpg',
        isPublic: true,
        tracksCount: 5,
        likesCount: 150,
        repostsCount: 12,
        user: { userId: mockOwnerId, username: 'playlist_creator', displayName: 'The Creator' },
        repostedAt: repost.createdAt,
      });
    });

    it('should return correct pagination shape', async () => {
      const repost = mockRepostWithPlaylist();
      userRepo.findById.mockResolvedValue(mockPublicUser());
      playlistRepo.getUserPlaylistReposts.mockResolvedValue([[repost], 5]);

      const result = await service.getUserPlaylistReposts(mockOtherUserId, mockMyUserId, 1, 2);

      expect(result.pagination).toMatchObject({
        currentPage: 1,
        totalPages: 3,
        totalCount: 5,
        limit: 2,
      });
    });

    it('should call userRepository.findById with the correct userId', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser());
      playlistRepo.getUserPlaylistReposts.mockResolvedValue([[], 0]);

      await service.getUserPlaylistReposts(mockOtherUserId, mockMyUserId);

      expect(userRepo.findById).toHaveBeenCalledWith(mockOtherUserId);
    });
  });

  // ─── likePlaylist() ───────────────────────────────────────────────────────

  describe('likePlaylist', () => {
    it('should return { status, data: { userId, playlistId, likedAt } } on success', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.findLikeByUserAndPlaylist.mockResolvedValue(null);
      playlistRepo.createLike.mockResolvedValue(undefined);

      const result = await service.likePlaylist(mockPlaylistId, mockUserId);

      expect(result.status).toBe('success');
      expect(result.data.userId).toBe(mockUserId);
      expect(result.data.playlistId).toBe(mockPlaylistId);
      expect(result.data.likedAt).toBeInstanceOf(Date);
    });

    it('should call createLike with correct args', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.findLikeByUserAndPlaylist.mockResolvedValue(null);
      playlistRepo.createLike.mockResolvedValue(undefined);

      await service.likePlaylist(mockPlaylistId, mockUserId);

      expect(playlistRepo.createLike).toHaveBeenCalledWith(mockUserId, mockPlaylistId);
      expect(playlistRepo.createLike).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when playlist not found', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(null);

      await expect(service.likePlaylist(mockPlaylistId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when playlist is private and user is not owner', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPrivatePlaylist());

      await expect(service.likePlaylist(mockPlaylistId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw ForbiddenException for private playlist BEFORE checking duplicate', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPrivatePlaylist());

      await expect(service.likePlaylist(mockPlaylistId, mockUserId)).rejects.toThrow();
      expect(playlistRepo.findLikeByUserAndPlaylist).not.toHaveBeenCalled();
    });

    it('should allow owner to like their own private playlist', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({
        ...mockPrivatePlaylist(),
        userId: mockUserId,
      });
      playlistRepo.findLikeByUserAndPlaylist.mockResolvedValue(null);
      playlistRepo.createLike.mockResolvedValue(undefined);

      await expect(service.likePlaylist(mockPlaylistId, mockUserId)).resolves.not.toThrow();
    });

    it('should throw ConflictException when already liked', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.findLikeByUserAndPlaylist.mockResolvedValue(mockLikeRecord());

      await expect(service.likePlaylist(mockPlaylistId, mockUserId)).rejects.toThrow(
        ConflictException
      );
    });

    it('should NOT call createLike when already liked', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.findLikeByUserAndPlaylist.mockResolvedValue(mockLikeRecord());

      await expect(service.likePlaylist(mockPlaylistId, mockUserId)).rejects.toThrow();
      expect(playlistRepo.createLike).not.toHaveBeenCalled();
    });
  });

  // ─── unlikePlaylist() ─────────────────────────────────────────────────────

  describe('unlikePlaylist', () => {
    it('should return { status, message } on success', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.findLikeByUserAndPlaylist.mockResolvedValue(mockLikeRecord());
      playlistRepo.removeLike.mockResolvedValue(undefined);

      const result = await service.unlikePlaylist(mockPlaylistId, mockUserId);

      expect(result).toEqual({ status: 'success', message: 'Playlist like successfully removed' });
    });

    it('should call removeLike with correct args', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.findLikeByUserAndPlaylist.mockResolvedValue(mockLikeRecord());
      playlistRepo.removeLike.mockResolvedValue(undefined);

      await service.unlikePlaylist(mockPlaylistId, mockUserId);

      expect(playlistRepo.removeLike).toHaveBeenCalledWith(mockUserId, mockPlaylistId);
    });

    it('should throw NotFoundException when playlist not found', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(null);

      await expect(service.unlikePlaylist(mockPlaylistId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when user has not liked the playlist', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.findLikeByUserAndPlaylist.mockResolvedValue(null);

      await expect(service.unlikePlaylist(mockPlaylistId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should NOT call removeLike when like not found', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.findLikeByUserAndPlaylist.mockResolvedValue(null);

      await expect(service.unlikePlaylist(mockPlaylistId, mockUserId)).rejects.toThrow();
      expect(playlistRepo.removeLike).not.toHaveBeenCalled();
    });
  });

  // ─── getLikesCount() ──────────────────────────────────────────────────────

  describe('getLikesCount', () => {
    it('should return { status, data: { playlistId, likesCount } }', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylistWithLikes());

      const result = await service.getLikesCount(mockPlaylistId, mockUserId);

      expect(result).toEqual({
        status: 'success',
        data: { playlistId: mockPlaylistId, likesCount: 17 },
      });
    });

    it('should throw NotFoundException when playlist not found', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(null);

      await expect(service.getLikesCount(mockPlaylistId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when playlist is private and user is not owner', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPrivatePlaylist());

      await expect(service.getLikesCount(mockPlaylistId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should allow owner to get likes count of their private playlist', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({
        ...mockPrivatePlaylist(),
        userId: mockUserId,
        likesCount: 3,
      });

      const result = await service.getLikesCount(mockPlaylistId, mockUserId);

      expect(result.data.likesCount).toBe(3);
    });
  });

  // ─── getPlaylistLikes() ───────────────────────────────────────────────────

  describe('getPlaylistLikes', () => {
    it('should return paginated likers with status: success', async () => {
      const liker = mockLikerEntry();
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.getPlaylistLikes.mockResolvedValue([[liker], 1]);

      const result = await service.getPlaylistLikes(mockPlaylistId, mockUserId, 1, 20);

      expect(result.status).toBe('success');
      expect(result.data).toHaveLength(1);
      expect(result.pagination).toMatchObject({ currentPage: 1, totalCount: 1 });
    });

    it('should throw NotFoundException when playlist not found', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(null);

      await expect(service.getPlaylistLikes(mockPlaylistId, mockUserId, 1, 20)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when playlist is private and user is not owner', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPrivatePlaylist());

      await expect(service.getPlaylistLikes(mockPlaylistId, mockUserId, 1, 20)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should allow owner to view likes of their private playlist', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({
        ...mockPrivatePlaylist(),
        userId: mockUserId,
      });
      playlistRepo.getPlaylistLikes.mockResolvedValue([[], 0]);

      await expect(
        service.getPlaylistLikes(mockPlaylistId, mockUserId, 1, 20)
      ).resolves.not.toThrow();
    });

    it('should cap limit at 100', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.getPlaylistLikes.mockResolvedValue([[], 0]);

      await service.getPlaylistLikes(mockPlaylistId, mockUserId, 1, 200);

      expect(playlistRepo.getPlaylistLikes).toHaveBeenCalledWith(mockPlaylistId, 1, 100);
    });

    it('should use defaults page=1, limit=20 when not provided', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.getPlaylistLikes.mockResolvedValue([[], 0]);

      await service.getPlaylistLikes(mockPlaylistId, mockUserId);

      expect(playlistRepo.getPlaylistLikes).toHaveBeenCalledWith(mockPlaylistId, 1, 20);
    });

    it('should map liker fields correctly with likedAt (not repostedAt)', async () => {
      const liker = mockLikerEntry();
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());
      playlistRepo.getPlaylistLikes.mockResolvedValue([[liker], 1]);

      const result = await service.getPlaylistLikes(mockPlaylistId, mockUserId, 1, 20);

      expect(result.data[0]).toMatchObject({
        userId: mockOtherUserId,
        username: 'other_user',
        displayName: 'Other User',
        avatarUrl: 'https://example.com/avatar.jpg',
        followersCount: 120,
        likedAt: liker.createdAt,
      });
      expect(result.data[0]).not.toHaveProperty('repostedAt');
    });
  });

  // ─── getUserPlaylistLikes() ───────────────────────────────────────────────

  describe('getUserPlaylistLikes', () => {
    it('should return paginated liked playlists with status: success', async () => {
      const like = mockLikeWithPlaylist();
      userRepo.findById.mockResolvedValue(mockPublicUser());
      playlistRepo.getUserPlaylistLikes.mockResolvedValue([[like], 1]);

      const result = await service.getUserPlaylistLikes(mockOtherUserId, mockMyUserId, 1, 20);

      expect(result.status).toBe('success');
      expect(result.data).toHaveLength(1);
      expect(result.pagination).toMatchObject({ currentPage: 1, totalCount: 1 });
    });

    it('should call getUserPlaylistLikes (not getUserPlaylistReposts) on repo', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser());
      playlistRepo.getUserPlaylistLikes.mockResolvedValue([[], 0]);

      await service.getUserPlaylistLikes(mockOtherUserId, mockMyUserId, 1, 20);

      expect(playlistRepo.getUserPlaylistLikes).toHaveBeenCalledWith(mockOtherUserId, 1, 20);
      expect(playlistRepo.getUserPlaylistReposts).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(service.getUserPlaylistLikes(mockOtherUserId, mockMyUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when account is private and requester is not the owner', async () => {
      userRepo.findById.mockResolvedValue(mockPrivateUser());

      await expect(service.getUserPlaylistLikes(mockOtherUserId, mockMyUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should allow a private user to view their own liked playlists', async () => {
      userRepo.findById.mockResolvedValue(mockPrivateUser());
      playlistRepo.getUserPlaylistLikes.mockResolvedValue([[], 0]);

      await expect(
        service.getUserPlaylistLikes(mockOtherUserId, mockOtherUserId)
      ).resolves.not.toThrow();
    });

    it('should cap limit at 100', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser());
      playlistRepo.getUserPlaylistLikes.mockResolvedValue([[], 0]);

      await service.getUserPlaylistLikes(mockOtherUserId, mockMyUserId, 1, 200);

      expect(playlistRepo.getUserPlaylistLikes).toHaveBeenCalledWith(mockOtherUserId, 1, 100);
    });

    it('should use defaults page=1, limit=20 when not provided', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser());
      playlistRepo.getUserPlaylistLikes.mockResolvedValue([[], 0]);

      await service.getUserPlaylistLikes(mockOtherUserId, mockMyUserId);

      expect(playlistRepo.getUserPlaylistLikes).toHaveBeenCalledWith(mockOtherUserId, 1, 20);
    });

    it('should map like fields correctly with likedAt (not repostedAt)', async () => {
      const like = mockLikeWithPlaylist();
      userRepo.findById.mockResolvedValue(mockPublicUser());
      playlistRepo.getUserPlaylistLikes.mockResolvedValue([[like], 1]);

      const result = await service.getUserPlaylistLikes(mockOtherUserId, mockMyUserId, 1, 20);

      expect(result.data[0]).toMatchObject({
        playlistId: mockPlaylistId,
        title: 'Summer Hits',
        isPublic: true,
        tracksCount: 5,
        likesCount: 150,
        repostsCount: 12,
        user: { userId: mockOwnerId, username: 'playlist_creator', displayName: 'The Creator' },
        likedAt: like.createdAt,
      });
      expect(result.data[0]).not.toHaveProperty('repostedAt');
    });
  });

  // ─── updatePlaylist() ──────────────────────────────────────────────────────

  describe('updatePlaylist', () => {
    it('should update with an image file and not crash on deleteFile', async () => {
      const mockPlaylist = {
        playlistId: mockPlaylistId,
        userId: mockUserId,
        coverImage: 'old-image.jpg',
      };
      const mockFile = { buffer: Buffer.from('fake-image') } as any;
      const updatedPlaylist = { ...mockPlaylist, title: 'New', coverImage: 'new.webp' };

      playlistRepo.findPlaylistById.mockResolvedValue(mockPlaylist);
      playlistRepo.updatePlaylist.mockResolvedValue(updatedPlaylist);
      playlistRepo.getPlaylistWithTagsandGenre.mockResolvedValue({
        ...updatedPlaylist,
        tags: [],
        genre: null,
        updatedAt: new Date(),
        buyLink: null,
        recordLabel: null,
        type: 'playlist',
        releaseDate: null,
        permalink: null,
      });

      storageService.uploadFile.mockResolvedValue({ Location: 'https://s3.com/new.webp' });
      storageService.deleteFile.mockReturnValue(Promise.resolve());

      const result = await service.updatePlaylist(
        mockUserId,
        mockPlaylistId,
        { title: 'New' },
        mockFile
      );

      expect(result.status).toBe('Success');
      expect(storageService.uploadFile).toHaveBeenCalled();
    });
  });

  // ─── addTrackToPlaylist() ─────────────────────────────────────────────────

  describe('addTrackToPlaylist', () => {
    const mockTrackId = '550e8400-e29b-41d4-a716-446655440005';

    it('should successfully add a track and return the documented response', async () => {
      const initialPlaylist = {
        ...mockOwnPlaylist(),
        tracksCount: 2,
        totalDurationSeconds: 400,
      };

      const track = { trackId: mockTrackId, durationSeconds: 200 };

      const savedRelation = {
        playlistId: mockPlaylistId,
        trackId: mockTrackId,
        position: 3,
        addedAt: new Date(),
      };

      const updatedPlaylist = {
        ...initialPlaylist,
        tracksCount: 3,
        totalDurationSeconds: 600,
      };

      playlistRepo.findPlaylistById
        .mockResolvedValueOnce(initialPlaylist)
        .mockResolvedValue(updatedPlaylist);

      playlistRepo.findTrackById.mockResolvedValue(track);
      playlistRepo.addTrackToPlaylist.mockResolvedValue(savedRelation);

      const result = await service.addTrackToPlaylist(mockPlaylistId, mockTrackId, mockUserId);

      expect(result.status).toBe('success');
      expect(result.data.position).toBe(3);
      expect(result.data.playlist.trackCount).toBe(3);
      expect(result.data.playlist.durationSeconds).toBe(600);

      expect(playlistRepo.addTrackToPlaylist).toHaveBeenCalledWith(mockPlaylistId, mockTrackId, 3);
    });
  });

  describe('getPlaylist', () => {
    it('should allow access to public playlist for guests', async () => {
      playlistRepo.getPlaylistDetails.mockResolvedValue({ isPublic: true, playlistTracks: [] });
      const result = await service.getPlaylist('id', null);
      expect(result.status).toBe('success');
    });

    it('should throw Forbidden if private and no token/not owner', async () => {
      playlistRepo.getPlaylistDetails.mockResolvedValue({
        isPublic: false,
        userId: 'owner-id',
        secretToken: 'shh',
      });
      await expect(service.getPlaylist('id', 'stranger-id')).rejects.toThrow(ForbiddenException);
    });

    it('should allow access to private playlist if valid secret token is provided', async () => {
      playlistRepo.getPlaylistDetails.mockResolvedValue({
        isPublic: false,
        secretToken: 'valid-token',
        playlistTracks: [],
      });
      const result = await service.getPlaylist('id', null, 'valid-token');
      expect(result.status).toBe('success');
    });
  });

  describe('bulkReorder', () => {
    it('should throw Forbidden if user is not the owner', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({ userId: 'other-user' });
      await expect(service.reorder('p1', ['t1'], 'my-id')).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequest if track count doesn't match array length", async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({ userId: 'u1', tracksCount: 5 });
      await expect(service.reorder('p1', ['t1', 't2'], 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should call repository.reorderTracks on success', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({ userId: 'u1', tracksCount: 2 });
      playlistRepo.findAllTrackIdsInPlaylist.mockResolvedValue(['t1', 't2']);

      const result = await service.reorder('p1', ['t2', 't1'], 'u1');

      expect(playlistRepo.reorderTracks).toHaveBeenCalledWith('p1', ['t2', 't1']);
      expect(result.status).toBe('success');
    });
  });

  // ─── createPlaylist() ─────────────────────────────────────────────────────

  describe('createPlaylist', () => {
    const baseDto = { title: 'My Playlist', isPublic: true, description: '', coverImage: '' };

    it('should return status success', async () => {
      playlistRepo.createPlaylist.mockResolvedValue({
        playlistId: mockPlaylistId,
        title: 'My Playlist',
        isPublic: true,
        tracksCount: 0,
        totalDurationSeconds: 0,
        likesCount: 0,
        repostsCount: 0,
        secretToken: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      (storageService as any).get = jest.fn();

      const result = await service.createPlaylist(baseDto, mockUserId);

      expect(playlistRepo.createPlaylist).toHaveBeenCalledWith(baseDto, mockUserId);
      expect(result.status).toBe('success');
    });

    it('should return secret token when isPublic is false', async () => {
      playlistRepo.createPlaylist.mockResolvedValue({
        playlistId: mockPlaylistId,
        title: 'Secret Playlist',
        isPublic: false,
        tracksCount: 0,
        totalDurationSeconds: 0,
        likesCount: 0,
        repostsCount: 0,
        secretToken: 'abc123',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });

      const result = await service.createPlaylist({ ...baseDto, isPublic: false }, mockUserId);

      expect(result.status).toBe('success');
      expect(result.data.secretToken).toBe('abc123');
    });
  });

  // ─── updatePlaylist() ─────────────────────────────────────────────────────

  describe('updatePlaylist', () => {
    it('should throw NotFoundException if playlist does not exist', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(null);
      await expect(
        service.updatePlaylist(mockUserId, mockPlaylistId, { title: 'New' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({ userId: mockOwnerId });
      await expect(
        service.updatePlaylist(mockUserId, mockPlaylistId, { title: 'New' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update metadata and return updated playlist', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({
        playlistId: mockPlaylistId,
        userId: mockUserId,
        coverImage: null,
      });
      playlistRepo.updatePlaylist.mockResolvedValue(undefined);
      playlistRepo.getPlaylistWithTagsandGenre.mockResolvedValue({
        playlistId: mockPlaylistId,
        title: 'New Title',
        description: 'New desc',
        coverImage: null,
        updatedAt: new Date(),
        buyLink: null,
        recordLabel: null,
        type: 'playlist',
        releaseDate: null,
        permalink: null,
        tags: [],
        genre: null,
      });

      const result = await service.updatePlaylist(mockUserId, mockPlaylistId, {
        title: 'New Title',
        description: 'New desc',
      });

      expect(playlistRepo.updatePlaylist).toHaveBeenCalledWith(
        mockPlaylistId,
        expect.objectContaining({ title: 'New Title', description: 'New desc' })
      );
      expect(result.status).toBe('Success');
      expect(result.data.title).toBe('New Title');
    });

    it('should upload new cover image and delete old one when file is provided', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({
        playlistId: mockPlaylistId,
        userId: mockUserId,
        coverImage: 'https://old-url.com/cover.jpg',
      });
      storageService.uploadFile.mockResolvedValue({
        Location: 'https://new-url.com/cover.webp',
      });
      storageService.deleteFile.mockResolvedValue(undefined);
      playlistRepo.updatePlaylist.mockResolvedValue(undefined);
      playlistRepo.getPlaylistWithTagsandGenre.mockResolvedValue({
        playlistId: mockPlaylistId,
        title: 'T',
        description: null,
        coverImage: 'https://new-url.com/cover.webp',
        updatedAt: new Date(),
        buyLink: null,
        recordLabel: null,
        type: 'playlist',
        releaseDate: null,
        permalink: null,
        tags: [],
        genre: null,
      });

      const fakeFile = {
        buffer: Buffer.from('img'),
        originalname: 'cover.jpg',
        mimetype: 'image/jpeg',
        size: 3,
      } as Express.Multer.File;

      await service.updatePlaylist(mockUserId, mockPlaylistId, {}, fakeFile);

      expect(storageService.uploadFile).toHaveBeenCalled();
    });
  });

  // ─── changePlaylistPrivacy() ──────────────────────────────────────────────

  describe('changePlaylistPrivacy', () => {
    it('should throw NotFoundException if playlist does not exist', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(null);
      await expect(service.changePlaylistPrivacy(mockPlaylistId, true, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({ isPublic: false, userId: mockOwnerId });
      await expect(
        service.changePlaylistPrivacy(mockPlaylistId, false, mockUserId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if playlist is already public', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({ isPublic: true, userId: mockUserId });
      await expect(service.changePlaylistPrivacy(mockPlaylistId, true, mockUserId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if playlist is already private', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({ isPublic: false, userId: mockUserId });
      await expect(
        service.changePlaylistPrivacy(mockPlaylistId, false, mockUserId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should return secretToken when making playlist private', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({ isPublic: true, userId: mockUserId });
      playlistRepo.changePlaylistPrivacy.mockResolvedValue('secret-token-xyz');

      const result = await service.changePlaylistPrivacy(mockPlaylistId, false, mockUserId);

      expect(result.status).toBe('success');
      expect(result.data.isPublic).toBe(false);
      expect(result.data.secretToken).toBe('secret-token-xyz');
    });

    it('should return isPublic true when making playlist public', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({ isPublic: false, userId: mockUserId });
      playlistRepo.changePlaylistPrivacy.mockResolvedValue(undefined);

      const result = await service.changePlaylistPrivacy(mockPlaylistId, true, mockUserId);

      expect(result.status).toBe('success');
      expect(result.data.isPublic).toBe(true);
      expect((result.data as any).secretToken).toBeUndefined();
    });
  });

  // ─── getPublicPlaylist() ──────────────────────────────────────────────────

  describe('getPublicPlaylist', () => {
    const fullPlaylistData = () => ({
      playlistId: mockPlaylistId,
      userId: mockOwnerId,
      title: 'Chill Beats',
      description: 'Lo-fi',
      coverImage: null,
      isPublic: true,
      tracksCount: 1,
      totalDurationSeconds: 210,
      likesCount: 5,
      repostsCount: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
      genre: { name: 'Lo-fi' },
      tags: [{ genreId: 'tag-1', name: 'Chill' }],
      user: { userId: mockOwnerId, displayName: 'Owner', avatarUrl: null },
      playlistTracks: [
        {
          position: 1,
          track: {
            trackId: 'track-1',
            title: 'Track A',
            durationSeconds: 210,
            coverImage: null,
            playCount: 100,
            likesCount: 10,
            repostsCount: 2,
            commentsCount: 1,
          },
        },
      ],
    });

    it('should throw NotFoundException if playlist does not exist', async () => {
      playlistRepo.getPublicPlaylist.mockResolvedValue(null);
      await expect(service.getPublicPlaylist(mockPlaylistId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException if playlist is private and user is not owner', async () => {
      playlistRepo.getPublicPlaylist.mockResolvedValue({
        ...fullPlaylistData(),
        isPublic: false,
        userId: mockOwnerId,
      });
      await expect(service.getPublicPlaylist(mockPlaylistId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should return full playlist data on success', async () => {
      playlistRepo.getPublicPlaylist.mockResolvedValue(fullPlaylistData());

      const result = await service.getPublicPlaylist(mockPlaylistId, mockUserId);

      expect(result.status).toBe('success');
      expect(result.data.playlistId).toBe(mockPlaylistId);
      expect(result.data.genreName).toBe('Lo-fi');
      expect(result.data.tracks).toHaveLength(1);
      expect(result.data.tags).toEqual([{ tagId: 'tag-1', name: 'Chill' }]);
    });
  });

  // ─── getSecretPlaylist() ──────────────────────────────────────────────────

  describe('getSecretPlaylist', () => {
    const secretPlaylistData = () => ({
      playlistId: mockPlaylistId,
      title: 'Secret Album',
      description: 'Private',
      coverImage: null,
      isPublic: false,
      tracksCount: 1,
      totalDurationSeconds: 180,
      likesCount: 0,
      repostsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [{ tagId: 'tag-1', name: 'Experimental' }],
      user: { userId: mockOwnerId, displayName: 'Artist', avatarUrl: null },
      playlistTracks: [
        {
          position: 1,
          track: {
            trackId: 'track-1',
            title: 'Unreleased',
            durationSeconds: 180,
            coverImage: null,
            playCount: 0,
            likesCount: 0,
            repostsCount: 0,
            commentsCount: 0,
          },
        },
      ],
    });

    it('should throw NotFoundException if secret token is invalid', async () => {
      playlistRepo.getSecretPlaylist.mockResolvedValue(null);
      await expect(service.getSecretPlaylist('invalid-token')).rejects.toThrow(NotFoundException);
    });

    it('should return playlist data on success', async () => {
      playlistRepo.getSecretPlaylist.mockResolvedValue(secretPlaylistData());

      const result = await service.getSecretPlaylist('valid-token');

      expect(result.status).toBe('success');
      expect(result.data.playlistId).toBe(mockPlaylistId);
      expect(result.data.tracks).toHaveLength(1);
      expect((result.data as any).secretToken).toBeUndefined();
    });
  });

  // ─── resetSecretToken() ───────────────────────────────────────────────────

  describe('resetSecretToken', () => {
    it('should throw NotFoundException if playlist does not exist', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(null);
      await expect(service.resetSecretToken(mockPlaylistId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException if playlist is public', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({ isPublic: true, userId: mockUserId });
      await expect(service.resetSecretToken(mockPlaylistId, mockUserId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({ isPublic: false, userId: mockOwnerId });
      await expect(service.resetSecretToken(mockPlaylistId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should return new secretToken on success', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({
        playlistId: mockPlaylistId,
        isPublic: false,
        userId: mockUserId,
      });
      playlistRepo.resetSecretToken.mockResolvedValue('new-secret-token');
      const result = await service.resetSecretToken(mockPlaylistId, mockUserId);

      expect(result.status).toBe('success');
      expect(result.data.secretToken).toBe('new-secret-token');
    });
  });

  // ─── getMyPlaylists() ─────────────────────────────────────────────────────

  describe('getMyPlaylists', () => {
    const mockMyPlaylistRecord = () => ({
      playlistId: mockPlaylistId,
      title: 'My Awesome Playlist',
      description: 'A great playlist',
      coverImage: 'https://example.com/cover.jpg',
      isPublic: true,
      tracksCount: 10,
      likesCount: 5,
      repostsCount: 2,
      totalDurationSeconds: 3600,
      createdAt: new Date('2024-06-01T12:00:00Z'),
      userId: mockUserId,
      user: {
        userId: mockUserId,
        username: 'test_user',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
    });

    it('should return paginated user playlists with status: success', async () => {
      const playlist = mockMyPlaylistRecord();
      playlistRepo.getMyPlaylists.mockResolvedValue([[playlist], 1]);

      const result = await service.getMyPlaylists(mockUserId, 1, 20);

      expect(result.status).toBe('success');
      expect(result.data).toHaveLength(1);
      expect(result.pagination).toMatchObject({ currentPage: 1, totalCount: 1 });
      expect(result.data[0]).toMatchObject({
        playlistId: mockPlaylistId,
        title: 'My Awesome Playlist',
        isOwner: true,
        durationSeconds: 3600,
        user: {
          userId: mockUserId,
          username: 'test_user',
        },
      });
    });

    it('should evaluate isOwner to false if the user ids do not match', async () => {
      const playlist = { ...mockMyPlaylistRecord(), userId: mockOtherUserId };
      playlistRepo.getMyPlaylists.mockResolvedValue([[playlist], 1]);

      const result = await service.getMyPlaylists(mockUserId, 1, 20);

      expect(result.data[0].isOwner).toBe(false);
    });

    it('should use default pagination parameters if not provided', async () => {
      playlistRepo.getMyPlaylists.mockResolvedValue([[], 0]);

      await service.getMyPlaylists(mockUserId);

      expect(playlistRepo.getMyPlaylists).toHaveBeenCalledWith(mockUserId, 1, 20);
    });
  });

  // ─── getUserPlaylists() ───────────────────────────────────────────────────

  describe('getUserPlaylists', () => {
    const mockUserPlaylist = {
      playlistId: mockPlaylistId,
      title: 'Vibes 2026',
      coverImage: 'https://example.com/cover.jpg',
      isPublic: true,
      tracksCount: 12,
      likesCount: 45,
      repostsCount: 3,
      createdAt: new Date('2024-06-01T12:00:00Z'),
      user: {
        userId: mockOtherUserId,
        username: 'other_user',
        displayName: 'Other User',
      },
    };

    it('should return paginated playlists with status: success', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser());
      playlistRepo.getUserPlaylists.mockResolvedValue([[mockUserPlaylist], 1]);

      const result = await service.getUserPlaylists(mockOtherUserId, mockMyUserId, 1, 20);

      expect(result.status).toBe('success');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].playlistId).toBe(mockPlaylistId);
      expect(result.pagination).toMatchObject({ currentPage: 1, totalCount: 1 });
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(service.getUserPlaylists(mockOtherUserId, mockMyUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when account is private and requester is not the owner', async () => {
      userRepo.findById.mockResolvedValue(mockPrivateUser());

      await expect(service.getUserPlaylists(mockOtherUserId, mockMyUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should allow a private user to view their own playlists', async () => {
      userRepo.findById.mockResolvedValue(mockPrivateUser());
      playlistRepo.getUserPlaylists.mockResolvedValue([[], 0]);

      await expect(
        service.getUserPlaylists(mockOtherUserId, mockOtherUserId)
      ).resolves.not.toThrow();
    });

    it('should return correct pagination shape', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser());
      playlistRepo.getUserPlaylists.mockResolvedValue([[], 5]);

      const result = await service.getUserPlaylists(mockOtherUserId, mockMyUserId, 2, 2);

      expect(result.pagination).toMatchObject({
        currentPage: 2,
        totalPages: 3, // 5 total items / limit of 2 = 3 pages
        totalCount: 5,
        limit: 2,
      });
    });

    it('should call userRepository.findById with the correct target userId', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser());
      playlistRepo.getUserPlaylists.mockResolvedValue([[], 0]);

      await service.getUserPlaylists(mockOtherUserId, mockMyUserId);

      expect(userRepo.findById).toHaveBeenCalledWith(mockOtherUserId);
    });
  });
});
