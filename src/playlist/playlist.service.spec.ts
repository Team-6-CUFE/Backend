import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { PlaylistRepository } from './playlist.repository';
import { UserRepository } from '../user/user.repository';
import { StorageService } from '../common/storage_service';
import { PlaylistService } from './playlist.service';

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
});

const mockStorageService = () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
});

const mockConfigService = () => ({
  get: jest.fn(),
});

const mockUserRepository = () => ({
  findById: jest.fn(),
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
        { provide: ConfigService, useFactory: mockConfigService },
        { provide: StorageService, useFactory: mockStorageService },
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

  // ─── updatePlaylist() ─────────────────────────────────────────────────────

  // ─── updatePlaylist() ──────────────────────────────────────────────────────

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

      // 1. Repo mocks
      playlistRepo.findPlaylistById.mockResolvedValue(mockPlaylist);
      playlistRepo.updatePlaylist.mockResolvedValue(updatedPlaylist);

      // 2. Storage mocks - THIS IS THE CRITICAL FIX
      // We must return an object that has a .catch method (a Promise)
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
      // Setup: Owner adding to their own playlist
      const playlist = { ...mockOwnPlaylist(), tracksCount: 2, totalDurationSeconds: 400 };
      const track = { trackId: mockTrackId, durationSeconds: 200 };
      const savedRelation = {
        playlistId: mockPlaylistId,
        trackId: mockTrackId,
        position: 3,
        addedAt: new Date(),
      };
      const updatedPlaylist = { ...playlist, tracksCount: 3, totalDurationSeconds: 600 };

      playlistRepo.findPlaylistById.mockResolvedValue(playlist);
      playlistRepo.findTrackById.mockResolvedValue(track);
      playlistRepo.addTrackToPlaylist.mockResolvedValue(savedRelation);
      playlistRepo.updatePlaylistStats.mockResolvedValue(updatedPlaylist);

      const result = await service.addTrackToPlaylist(mockPlaylistId, mockTrackId, mockUserId);

      expect(result.status).toBe('success');
      expect(result.data.position).toBe(3);
      expect(result.data.playlist.trackCount).toBe(3);
      expect(result.data.playlist.durationSeconds).toBe(600);
      expect(playlistRepo.addTrackToPlaylist).toHaveBeenCalledWith(mockPlaylistId, mockTrackId, 3);
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      // Playlist owned by mockOwnerId, requester is mockUserId
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());

      await expect(
        service.addTrackToPlaylist(mockPlaylistId, mockTrackId, mockUserId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if playlist does not exist', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(null);

      await expect(
        service.addTrackToPlaylist(mockPlaylistId, mockTrackId, mockUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if track does not exist', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockOwnPlaylist());
      playlistRepo.findTrackById.mockResolvedValue(null);

      await expect(
        service.addTrackToPlaylist(mockPlaylistId, mockTrackId, mockUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if track is already in playlist (DB Error 23505)', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockOwnPlaylist());
      playlistRepo.findTrackById.mockResolvedValue({ trackId: mockTrackId });

      // Simulate Postgres unique constraint violation
      playlistRepo.addTrackToPlaylist.mockRejectedValue({ code: '23505' });

      await expect(
        service.addTrackToPlaylist(mockPlaylistId, mockTrackId, mockUserId)
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── addTrackToPlaylist() ─────────────────────────────────────────────────

  describe('addTrackToPlaylist', () => {
    const mockTrackId = '550e8400-e29b-41d4-a716-446655440005';

    it('should successfully add a track and return the documented response', async () => {
      // Setup: Owner adding to their own playlist
      const playlist = { ...mockOwnPlaylist(), tracksCount: 2, totalDurationSeconds: 400 };
      const track = { trackId: mockTrackId, durationSeconds: 200 };
      const savedRelation = {
        playlistId: mockPlaylistId,
        trackId: mockTrackId,
        position: 3,
        addedAt: new Date(),
      };
      const updatedPlaylist = { ...playlist, tracksCount: 3, totalDurationSeconds: 600 };

      playlistRepo.findPlaylistById.mockResolvedValue(playlist);
      playlistRepo.findTrackById.mockResolvedValue(track);
      playlistRepo.addTrackToPlaylist.mockResolvedValue(savedRelation);
      playlistRepo.updatePlaylistStats.mockResolvedValue(updatedPlaylist);

      const result = await service.addTrackToPlaylist(mockPlaylistId, mockTrackId, mockUserId);

      expect(result.status).toBe('success');
      expect(result.data.position).toBe(3);
      expect(result.data.playlist.trackCount).toBe(3);
      expect(result.data.playlist.durationSeconds).toBe(600);
      expect(playlistRepo.addTrackToPlaylist).toHaveBeenCalledWith(mockPlaylistId, mockTrackId, 3);
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      // Playlist owned by mockOwnerId, requester is mockUserId
      playlistRepo.findPlaylistById.mockResolvedValue(mockPublicPlaylist());

      await expect(
        service.addTrackToPlaylist(mockPlaylistId, mockTrackId, mockUserId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if playlist does not exist', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(null);

      await expect(
        service.addTrackToPlaylist(mockPlaylistId, mockTrackId, mockUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if track does not exist', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockOwnPlaylist());
      playlistRepo.findTrackById.mockResolvedValue(null);

      await expect(
        service.addTrackToPlaylist(mockPlaylistId, mockTrackId, mockUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if track is already in playlist (DB Error 23505)', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(mockOwnPlaylist());
      playlistRepo.findTrackById.mockResolvedValue({ trackId: mockTrackId });

      // Simulate Postgres unique constraint violation
      playlistRepo.addTrackToPlaylist.mockRejectedValue({ code: '23505' });

      await expect(
        service.addTrackToPlaylist(mockPlaylistId, mockTrackId, mockUserId)
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removeTrackFromPlaylist', () => {
    it('should throw NotFound if playlist does not exist', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(null);
      await expect(service.removeTrackFromPlaylist('p1', 't1', 'u1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw Forbidden if user is not the owner', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({ userId: 'other-user' });
      await expect(service.removeTrackFromPlaylist('p1', 't1', 'u1')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should succeed if owner and track exists', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({ userId: 'u1' });
      playlistRepo.findTrackInPlaylist.mockResolvedValue({ position: 5 });
      playlistRepo.findTrackById.mockResolvedValue({ durationSeconds: 200 });

      const result = await service.removeTrackFromPlaylist('p1', 't1', 'u1');

      expect(playlistRepo.removeTrackAndReorder).toHaveBeenCalledWith('p1', 't1', 5, 200);
      expect(result.status).toBe('success');
    });
  });

  describe('deletePlaylist', () => {
    it('should throw NotFoundException if playlist does not exist', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue(null);
      await expect(service.deletePlaylist('id', 'user')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({ userId: 'other-user' });
      await expect(service.deletePlaylist('id', 'my-user')).rejects.toThrow(ForbiddenException);
    });

    it('should successfully delete if owner matches', async () => {
      playlistRepo.findPlaylistById.mockResolvedValue({ userId: 'my-user' });
      playlistRepo.deletePlaylist.mockResolvedValue(undefined);

      const result = await service.deletePlaylist('id', 'my-user');
      expect(result.status).toBe('success');
      expect(playlistRepo.deletePlaylist).toHaveBeenCalledWith('id');
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
});
