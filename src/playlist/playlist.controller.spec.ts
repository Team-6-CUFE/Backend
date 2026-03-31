import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PlaylistController } from './playlist.controller';
import { PlaylistService } from './playlist.service';
import { NoBlockGuard } from '../followers/guards/no-block.guard';

// ─── Constants ────────────────────────────────────────────────────────────────

const mockPlaylistId = '550e8400-e29b-41d4-a716-446655440000';
const mockUserId = '550e8400-e29b-41d4-a716-446655440001';
const mockMyUserId = '550e8400-e29b-41d4-a716-446655440002';
const mockPage = 1;
const mockLimit = 20;

// ─── Mock factory ─────────────────────────────────────────────────────────────

const mockPlaylistService = () => ({
  repostPlaylist: jest.fn(),
  removeRepost: jest.fn(),
  getRepostsCount: jest.fn(),
  getPlaylistReposters: jest.fn(),
  getUserPlaylistReposts: jest.fn(),
});

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('PlaylistController', () => {
  let controller: PlaylistController;
  let service: ReturnType<typeof mockPlaylistService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlaylistController],
      providers: [{ provide: PlaylistService, useFactory: mockPlaylistService }],
    })
      .overrideGuard(NoBlockGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PlaylistController);
    service = module.get(PlaylistService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── repostPlaylist ───────────────────────────────────────────────────────

  describe('repostPlaylist', () => {
    it('should delegate to service with playlistId and userId', async () => {
      service.repostPlaylist.mockResolvedValue({
        status: 'success',
        data: { userId: mockUserId, playlistId: mockPlaylistId, repostedAt: new Date() },
      });

      await controller.repostPlaylist(mockPlaylistId, mockUserId);

      expect(service.repostPlaylist).toHaveBeenCalledWith(mockPlaylistId, mockUserId);
      expect(service.repostPlaylist).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        data: { userId: mockUserId, playlistId: mockPlaylistId, repostedAt: new Date() },
      };
      service.repostPlaylist.mockResolvedValue(mockResponse);

      const result = await controller.repostPlaylist(mockPlaylistId, mockUserId);

      expect(result).toBe(mockResponse);
    });

    it('should propagate NotFoundException when playlist not found', async () => {
      service.repostPlaylist.mockRejectedValue(new NotFoundException('Playlist not found'));

      await expect(controller.repostPlaylist(mockPlaylistId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should propagate ForbiddenException when playlist is private', async () => {
      service.repostPlaylist.mockRejectedValue(
        new ForbiddenException('Cannot repost a private playlist')
      );

      await expect(controller.repostPlaylist(mockPlaylistId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should propagate BadRequestException when user is the owner', async () => {
      service.repostPlaylist.mockRejectedValue(
        new BadRequestException('You cannot repost your own playlist')
      );

      await expect(controller.repostPlaylist(mockPlaylistId, mockUserId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should propagate ConflictException when already reposted', async () => {
      service.repostPlaylist.mockRejectedValue(
        new ConflictException('You have already reposted this playlist')
      );

      await expect(controller.repostPlaylist(mockPlaylistId, mockUserId)).rejects.toThrow(
        ConflictException
      );
    });
  });

  // ─── removeRepost ─────────────────────────────────────────────────────────

  describe('removeRepost', () => {
    it('should delegate to service with playlistId and userId', async () => {
      service.removeRepost.mockResolvedValue({
        status: 'success',
        message: 'Playlist repost successfully removed',
      });

      await controller.removeRepost(mockPlaylistId, mockUserId);

      expect(service.removeRepost).toHaveBeenCalledWith(mockPlaylistId, mockUserId);
      expect(service.removeRepost).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = { status: 'success', message: 'Playlist repost successfully removed' };
      service.removeRepost.mockResolvedValue(mockResponse);

      const result = await controller.removeRepost(mockPlaylistId, mockUserId);

      expect(result).toBe(mockResponse);
    });

    it('should propagate NotFoundException when playlist not found', async () => {
      service.removeRepost.mockRejectedValue(new NotFoundException('Playlist not found'));

      await expect(controller.removeRepost(mockPlaylistId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should propagate ForbiddenException when user has not reposted', async () => {
      service.removeRepost.mockRejectedValue(
        new ForbiddenException('You have not reposted this playlist')
      );

      await expect(controller.removeRepost(mockPlaylistId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ─── getRepostsCount ──────────────────────────────────────────────────────

  describe('getRepostsCount', () => {
    it('should delegate to service with playlistId only', async () => {
      service.getRepostsCount.mockResolvedValue({
        status: 'success',
        data: { playlistId: mockPlaylistId, repostCount: 42 },
      });

      await controller.getRepostsCount(mockPlaylistId);

      expect(service.getRepostsCount).toHaveBeenCalledWith(mockPlaylistId);
      expect(service.getRepostsCount).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        data: { playlistId: mockPlaylistId, repostCount: 42 },
      };
      service.getRepostsCount.mockResolvedValue(mockResponse);

      const result = await controller.getRepostsCount(mockPlaylistId);

      expect(result).toBe(mockResponse);
    });

    it('should propagate NotFoundException when playlist not found', async () => {
      service.getRepostsCount.mockRejectedValue(new NotFoundException('Playlist not found'));

      await expect(controller.getRepostsCount(mockPlaylistId)).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when playlist is private', async () => {
      service.getRepostsCount.mockRejectedValue(new ForbiddenException('This playlist is private'));

      await expect(controller.getRepostsCount(mockPlaylistId)).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getPlaylistReposters ─────────────────────────────────────────────────

  describe('getPlaylistReposters', () => {
    it('should delegate to service with playlistId, userId, page, and limit', async () => {
      service.getPlaylistReposters.mockResolvedValue({
        status: 'success',
        data: [],
        pagination: { currentPage: 1, totalPages: 0, totalCount: 0, limit: mockLimit },
      });

      await controller.getPlaylistReposters(mockPlaylistId, mockUserId, mockPage, mockLimit);

      expect(service.getPlaylistReposters).toHaveBeenCalledWith(
        mockPlaylistId,
        mockUserId,
        mockPage,
        mockLimit
      );
      expect(service.getPlaylistReposters).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        data: [{ userId: mockUserId, username: 'user', repostedAt: new Date() }],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 1, limit: mockLimit },
      };
      service.getPlaylistReposters.mockResolvedValue(mockResponse);

      const result = await controller.getPlaylistReposters(
        mockPlaylistId,
        mockUserId,
        mockPage,
        mockLimit
      );

      expect(result).toBe(mockResponse);
    });

    it('should propagate NotFoundException when playlist not found', async () => {
      service.getPlaylistReposters.mockRejectedValue(new NotFoundException('Playlist not found'));

      await expect(
        controller.getPlaylistReposters(mockPlaylistId, mockUserId, mockPage, mockLimit)
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when playlist is private', async () => {
      service.getPlaylistReposters.mockRejectedValue(
        new ForbiddenException('This playlist is private')
      );

      await expect(
        controller.getPlaylistReposters(mockPlaylistId, mockUserId, mockPage, mockLimit)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getUserTrackReposts ──────────────────────────────────────────────────

  describe('getUserTrackReposts', () => {
    it('should delegate to service with userId, myUserId, page, and limit', async () => {
      service.getUserPlaylistReposts.mockResolvedValue({
        status: 'success',
        data: [],
        pagination: { currentPage: 1, totalPages: 0, totalCount: 0, limit: mockLimit },
      });

      await controller.getUserTrackReposts(mockUserId, mockMyUserId, mockPage, mockLimit);

      expect(service.getUserPlaylistReposts).toHaveBeenCalledWith(
        mockUserId,
        mockMyUserId,
        mockPage,
        mockLimit
      );
      expect(service.getUserPlaylistReposts).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        data: [{ playlistId: mockPlaylistId, title: 'Summer Hits' }],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 1, limit: mockLimit },
      };
      service.getUserPlaylistReposts.mockResolvedValue(mockResponse);

      const result = await controller.getUserTrackReposts(
        mockUserId,
        mockMyUserId,
        mockPage,
        mockLimit
      );

      expect(result).toBe(mockResponse);
    });

    it('should propagate NotFoundException when user not found', async () => {
      service.getUserPlaylistReposts.mockRejectedValue(new NotFoundException('User not found'));

      await expect(
        controller.getUserTrackReposts(mockUserId, mockMyUserId, mockPage, mockLimit)
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when account is private', async () => {
      service.getUserPlaylistReposts.mockRejectedValue(
        new ForbiddenException('This account is private')
      );

      await expect(
        controller.getUserTrackReposts(mockUserId, mockMyUserId, mockPage, mockLimit)
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
