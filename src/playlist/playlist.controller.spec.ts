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
  likePlaylist: jest.fn(),
  unlikePlaylist: jest.fn(),
  getLikesCount: jest.fn(),
  getPlaylistLikes: jest.fn(),
  getUserPlaylistLikes: jest.fn(),
  createPlaylist: jest.fn(),
  updatePlaylist: jest.fn(),
  indTrackById: jest.fn(),
  updatePlaylistStats: jest.fn(),
  addTrackToPlaylist: jest.fn(),
  findMaxPosition: jest.fn(),
  findTrackInPlaylist: jest.fn(),
  removeTrackAndReorder: jest.fn(),
  removeTrackFromPlaylist: jest.fn(),
  deletePlaylist: jest.fn(),
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

  // ─── likePlaylist ─────────────────────────────────────────────────────────

  describe('likePlaylist', () => {
    it('should delegate to service with playlistId and userId', async () => {
      service.likePlaylist.mockResolvedValue({
        status: 'success',
        data: { userId: mockUserId, playlistId: mockPlaylistId, likedAt: new Date() },
      });

      await controller.likePlaylist(mockPlaylistId, mockUserId);

      expect(service.likePlaylist).toHaveBeenCalledWith(mockPlaylistId, mockUserId);
      expect(service.likePlaylist).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        data: { userId: mockUserId, playlistId: mockPlaylistId, likedAt: new Date() },
      };
      service.likePlaylist.mockResolvedValue(mockResponse);

      const result = await controller.likePlaylist(mockPlaylistId, mockUserId);

      expect(result).toBe(mockResponse);
    });

    it('should propagate NotFoundException when playlist not found', async () => {
      service.likePlaylist.mockRejectedValue(new NotFoundException('Playlist not found'));

      await expect(controller.likePlaylist(mockPlaylistId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should propagate ForbiddenException when playlist is private', async () => {
      service.likePlaylist.mockRejectedValue(new ForbiddenException('This playlist is private'));

      await expect(controller.likePlaylist(mockPlaylistId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should propagate ConflictException when already liked', async () => {
      service.likePlaylist.mockRejectedValue(
        new ConflictException('You have already liked this playlist')
      );

      await expect(controller.likePlaylist(mockPlaylistId, mockUserId)).rejects.toThrow(
        ConflictException
      );
    });
  });

  // ─── unlikePlaylist ───────────────────────────────────────────────────────

  describe('unlikePlaylist', () => {
    it('should delegate to service with playlistId and userId', async () => {
      service.unlikePlaylist.mockResolvedValue({
        status: 'success',
        message: 'Playlist like successfully removed',
      });

      await controller.unlikePlaylist(mockPlaylistId, mockUserId);

      expect(service.unlikePlaylist).toHaveBeenCalledWith(mockPlaylistId, mockUserId);
      expect(service.unlikePlaylist).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = { status: 'success', message: 'Playlist like successfully removed' };
      service.unlikePlaylist.mockResolvedValue(mockResponse);

      const result = await controller.unlikePlaylist(mockPlaylistId, mockUserId);

      expect(result).toBe(mockResponse);
    });

    it('should propagate NotFoundException when playlist not found', async () => {
      service.unlikePlaylist.mockRejectedValue(new NotFoundException('Playlist not found'));

      await expect(controller.unlikePlaylist(mockPlaylistId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should propagate ForbiddenException when user has not liked', async () => {
      service.unlikePlaylist.mockRejectedValue(
        new ForbiddenException('You have not liked this playlist')
      );

      await expect(controller.unlikePlaylist(mockPlaylistId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ─── getLikesCount ────────────────────────────────────────────────────────

  describe('getLikesCount', () => {
    it('should delegate to service with playlistId and userId', async () => {
      service.getLikesCount.mockResolvedValue({
        status: 'success',
        data: { playlistId: mockPlaylistId, likesCount: 17 },
      });

      await controller.getLikesCount(mockPlaylistId, mockUserId);

      expect(service.getLikesCount).toHaveBeenCalledWith(mockPlaylistId, mockUserId);
      expect(service.getLikesCount).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        data: { playlistId: mockPlaylistId, likesCount: 17 },
      };
      service.getLikesCount.mockResolvedValue(mockResponse);

      const result = await controller.getLikesCount(mockPlaylistId, mockUserId);

      expect(result).toBe(mockResponse);
    });

    it('should propagate NotFoundException when playlist not found', async () => {
      service.getLikesCount.mockRejectedValue(new NotFoundException('Playlist not found'));

      await expect(controller.getLikesCount(mockPlaylistId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should propagate ForbiddenException when playlist is private', async () => {
      service.getLikesCount.mockRejectedValue(new ForbiddenException('This playlist is private'));

      await expect(controller.getLikesCount(mockPlaylistId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ─── getPlaylistLikes ─────────────────────────────────────────────────────

  describe('getPlaylistLikes', () => {
    it('should delegate to service with playlistId, userId, page, and limit', async () => {
      service.getPlaylistLikes.mockResolvedValue({
        status: 'success',
        data: [],
        pagination: { currentPage: 1, totalPages: 0, totalCount: 0, limit: mockLimit },
      });

      await controller.getPlaylistLikes(mockPlaylistId, mockUserId, mockPage, mockLimit);

      expect(service.getPlaylistLikes).toHaveBeenCalledWith(
        mockPlaylistId,
        mockUserId,
        mockPage,
        mockLimit
      );
      expect(service.getPlaylistLikes).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        data: [{ userId: mockUserId, username: 'user', likedAt: new Date() }],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 1, limit: mockLimit },
      };
      service.getPlaylistLikes.mockResolvedValue(mockResponse);

      const result = await controller.getPlaylistLikes(
        mockPlaylistId,
        mockUserId,
        mockPage,
        mockLimit
      );

      expect(result).toBe(mockResponse);
    });

    it('should propagate NotFoundException when playlist not found', async () => {
      service.getPlaylistLikes.mockRejectedValue(new NotFoundException('Playlist not found'));

      await expect(
        controller.getPlaylistLikes(mockPlaylistId, mockUserId, mockPage, mockLimit)
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when playlist is private', async () => {
      service.getPlaylistLikes.mockRejectedValue(
        new ForbiddenException('This playlist is private')
      );

      await expect(
        controller.getPlaylistLikes(mockPlaylistId, mockUserId, mockPage, mockLimit)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getUserPlaylistLikes ─────────────────────────────────────────────────

  describe('getUserPlaylistLikes', () => {
    it('should delegate to service with userId, myUserId, page, and limit', async () => {
      service.getUserPlaylistLikes.mockResolvedValue({
        status: 'success',
        data: [],
        pagination: { currentPage: 1, totalPages: 0, totalCount: 0, limit: mockLimit },
      });

      await controller.getUserTrackLikes(mockUserId, mockMyUserId, mockPage, mockLimit);

      expect(service.getUserPlaylistLikes).toHaveBeenCalledWith(
        mockUserId,
        mockMyUserId,
        mockPage,
        mockLimit
      );
      expect(service.getUserPlaylistLikes).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        data: [{ playlistId: mockPlaylistId, title: 'Summer Hits', likedAt: new Date() }],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 1, limit: mockLimit },
      };
      service.getUserPlaylistLikes.mockResolvedValue(mockResponse);

      const result = await controller.getUserTrackLikes(
        mockUserId,
        mockMyUserId,
        mockPage,
        mockLimit
      );

      expect(result).toBe(mockResponse);
    });

    it('should propagate NotFoundException when user not found', async () => {
      service.getUserPlaylistLikes.mockRejectedValue(new NotFoundException('User not found'));

      await expect(
        controller.getUserTrackLikes(mockUserId, mockMyUserId, mockPage, mockLimit)
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when account is private', async () => {
      service.getUserPlaylistLikes.mockRejectedValue(
        new ForbiddenException('This account is private')
      );

      await expect(
        controller.getUserTrackLikes(mockUserId, mockMyUserId, mockPage, mockLimit)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── updatePlaylist ───────────────────────────────────────────────────────

  describe('updatePlaylist', () => {
    const updateDto = { title: 'Updated Title' };
    const mockFile = { buffer: Buffer.from('test') } as Express.Multer.File;

    it('should delegate to service with userId, playlistId, dto and file', async () => {
      const mockResponse = { status: 'Success', message: 'Playlist updated successfully' };
      service.updatePlaylist.mockResolvedValue(mockResponse);

      const result = await controller.updatePlaylist(
        mockUserId,
        mockPlaylistId,
        updateDto,
        mockFile
      );

      expect(service.updatePlaylist).toHaveBeenCalledWith(
        mockUserId,
        mockPlaylistId,
        updateDto,
        mockFile
      );
      expect(result).toBe(mockResponse);
    });

    it('should work even if file is not provided', async () => {
      const mockResponse = { status: 'Success' };
      service.updatePlaylist.mockResolvedValue(mockResponse);

      const result = await controller.updatePlaylist(
        mockUserId,
        mockPlaylistId,
        updateDto,
        undefined // No file
      );

      expect(service.updatePlaylist).toHaveBeenCalledWith(
        mockUserId,
        mockPlaylistId,
        updateDto,
        undefined
      );
      expect(result.status).toBe('Success');
    });

    it('should propagate NotFoundException from service', async () => {
      service.updatePlaylist.mockRejectedValue(new NotFoundException());

      await expect(
        controller.updatePlaylist(mockUserId, mockPlaylistId, updateDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException from service', async () => {
      service.updatePlaylist.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.updatePlaylist(mockUserId, mockPlaylistId, updateDto)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── addTrackToPlaylist ───────────────────────────────────────────────────

  describe('addTrackToPlaylist', () => {
    const addTrackDto = { trackId: '550e8400-e29b-41d4-a716-446655440005' };

    it('should delegate to service with playlistId, trackId from body, and userId', async () => {
      const mockResponse = {
        status: 'success',
        data: { playlistId: mockPlaylistId, trackId: addTrackDto.trackId, position: 1 },
      };
      service.addTrackToPlaylist.mockResolvedValue(mockResponse);

      const result = await controller.addTrackToPlaylist(mockPlaylistId, addTrackDto, mockUserId);

      expect(service.addTrackToPlaylist).toHaveBeenCalledWith(
        mockPlaylistId,
        addTrackDto.trackId,
        mockUserId
      );
      expect(result).toBe(mockResponse);
    });

    it('should propagate NotFoundException when playlist or track not found', async () => {
      service.addTrackToPlaylist.mockRejectedValue(new NotFoundException('Track not found'));

      await expect(
        controller.addTrackToPlaylist(mockPlaylistId, addTrackDto, mockUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when user is not owner', async () => {
      service.addTrackToPlaylist.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.addTrackToPlaylist(mockPlaylistId, addTrackDto, mockUserId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should propagate ConflictException when track already exists in playlist', async () => {
      service.addTrackToPlaylist.mockRejectedValue(new ConflictException());

      await expect(
        controller.addTrackToPlaylist(mockPlaylistId, addTrackDto, mockUserId)
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removeTrack', () => {
    it('should delegate to service', async () => {
      const mockResponse = {
        status: 'success',
        message: 'Track removed from playlist successfully',
      };

      // 1. Mock the correct service method
      service.removeTrackFromPlaylist.mockResolvedValue(mockResponse);

      // 2. Call the controller
      const result = await controller.removeTrack(mockPlaylistId, 'track-id', mockUserId);

      // 3. Assert on the service method, not the repository method
      expect(service.removeTrackFromPlaylist).toHaveBeenCalledWith(
        mockPlaylistId,
        'track-id',
        mockUserId
      );
      expect(result).toBe(mockResponse);
    });
  });

  describe('deletePlaylist', () => {
    it('should delegate to service', async () => {
      const mockResponse = { status: 'success', message: 'deleted' };
      service.deletePlaylist.mockResolvedValue(mockResponse);

      const result = await controller.deletePlaylist(mockPlaylistId, mockUserId);

      expect(service.deletePlaylist).toHaveBeenCalledWith(mockPlaylistId, mockUserId);
      expect(result).toBe(mockResponse);
    });
  });
});
