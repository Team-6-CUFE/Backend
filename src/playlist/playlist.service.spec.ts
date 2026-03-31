import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PlaylistService } from './playlist.service';
import { PlaylistRepository } from './playlist.repository';
import { UserRepository } from '../user/user.repository';

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('PlaylistService', () => {
  let service: PlaylistService;
  let playlistRepo: ReturnType<typeof mockPlaylistRepository>;
  let userRepo: ReturnType<typeof mockUserRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaylistService,
        { provide: PlaylistRepository, useFactory: mockPlaylistRepository },
        { provide: UserRepository, useFactory: mockUserRepository },
      ],
    }).compile();

    service = module.get(PlaylistService);
    playlistRepo = module.get(PlaylistRepository);
    userRepo = module.get(UserRepository);
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
});
