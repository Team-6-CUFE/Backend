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
const mockIp = '192.168.1.1';

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
  getPlaylist: jest.fn(),
  reorder: jest.fn(),
  changePlaylistPrivacy: jest.fn(),
  getPublicPlaylist: jest.fn(),
  getSecretPlaylist: jest.fn(),
  resetSecretToken: jest.fn(),
  getMyPlaylists: jest.fn(),
  getUserPlaylists: jest.fn(),
});

jest.mock('meilisearch', () => ({
  Meilisearch: jest.fn().mockImplementation(() => ({
    index: jest.fn().mockReturnValue({
      addDocuments: jest.fn(),
      search: jest.fn(),
    }),
  })),
}));

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
        mockLimit,
        undefined
      );
      expect(service.getUserPlaylistLikes).toHaveBeenCalledTimes(1);
    });

    it("should pass filter='playlist' to service", async () => {
      service.getUserPlaylistLikes.mockResolvedValue({
        status: 'success',
        data: [],
        pagination: { currentPage: 1, totalPages: 0, totalCount: 0, limit: mockLimit },
      });

      await controller.getUserTrackLikes(mockUserId, mockMyUserId, mockPage, mockLimit, 'playlist');

      expect(service.getUserPlaylistLikes).toHaveBeenCalledWith(
        mockUserId,
        mockMyUserId,
        mockPage,
        mockLimit,
        'playlist'
      );
    });

    it("should pass filter='station' to service", async () => {
      service.getUserPlaylistLikes.mockResolvedValue({
        status: 'success',
        data: [],
        pagination: { currentPage: 1, totalPages: 0, totalCount: 0, limit: mockLimit },
      });

      await controller.getUserTrackLikes(mockUserId, mockMyUserId, mockPage, mockLimit, 'station');

      expect(service.getUserPlaylistLikes).toHaveBeenCalledWith(
        mockUserId,
        mockMyUserId,
        mockPage,
        mockLimit,
        'station'
      );
    });

    it("should pass filter='album' to service", async () => {
      service.getUserPlaylistLikes.mockResolvedValue({
        status: 'success',
        data: [],
        pagination: { currentPage: 1, totalPages: 0, totalCount: 0, limit: mockLimit },
      });

      await controller.getUserTrackLikes(mockUserId, mockMyUserId, mockPage, mockLimit, 'album');

      expect(service.getUserPlaylistLikes).toHaveBeenCalledWith(
        mockUserId,
        mockMyUserId,
        mockPage,
        mockLimit,
        'album'
      );
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

      service.removeTrackFromPlaylist.mockResolvedValue(mockResponse);

      const result = await controller.removeTrack(mockPlaylistId, 'track-id', mockUserId);

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

  describe('getPlaylist', () => {
    it('should delegate to service', async () => {
      const mockRes = { status: 'success', data: {} };
      service.getPlaylist.mockResolvedValue(mockRes);

      const result = await controller.getPlaylist(mockPlaylistId, 'secret-123', mockUserId);

      expect(service.getPlaylist).toHaveBeenCalledWith(mockPlaylistId, mockUserId, 'secret-123');
      expect(result).toBe(mockRes);
    });
  });

  describe('bulkReorder', () => {
    it('should delegate to playlistService.bulkReorder', async () => {
      const trackIds = [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
      ];
      const mockResponse = {
        status: 'success',
        data: { playlist_id: mockPlaylistId, track_count: 2 },
      };

      service.reorder.mockResolvedValue(mockResponse);

      const result = await controller.bulkReorder(mockPlaylistId, trackIds, mockUserId);

      expect(service.reorder).toHaveBeenCalledWith(mockPlaylistId, trackIds, mockUserId);
      expect(result).toBe(mockResponse);
    });

    it('should throw BadRequestException if track_ids is not an array', async () => {
      await expect(
        controller.bulkReorder(mockPlaylistId, 'not-an-array' as any, mockUserId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── createPlaylist ───────────────────────────────────────────────────────

  describe('createPlaylist', () => {
    const dto = { title: 'New Playlist', isPublic: true, description: '', coverImage: '' };

    it('should delegate to service with dto and userId', async () => {
      const mockResponse = { status: 'success', data: { playlistId: mockPlaylistId } };
      service.createPlaylist.mockResolvedValue(mockResponse);

      const result = await controller.createPlaylist(dto as any, mockUserId);

      expect(service.createPlaylist).toHaveBeenCalledWith(dto, mockUserId);
      expect(result).toBe(mockResponse);
    });

    it('should propagate errors from service', async () => {
      service.createPlaylist.mockRejectedValue(new BadRequestException('Validation failed'));
      await expect(controller.createPlaylist(dto as any, mockUserId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ─── getPublicPlaylist ────────────────────────────────────────────────────

  describe('getPublicPlaylist', () => {
    it('should delegate to service with playlistId and userId', async () => {
      const mockResponse = {
        status: 'success',
        data: { playlistId: mockPlaylistId, title: 'Chill Beats' },
      };
      service.getPublicPlaylist.mockResolvedValue(mockResponse);

      const result = await controller.getPublicPlaylist(mockPlaylistId, mockUserId, '1.2.3.4');

      expect(service.getPublicPlaylist).toHaveBeenCalledWith(
        mockPlaylistId,
        mockUserId,
        '1.2.3.4',
        undefined
      );
      expect(result).toBe(mockResponse);
    });

    it('should propagate NotFoundException from service', async () => {
      service.getPublicPlaylist.mockRejectedValue(new NotFoundException());
      await expect(
        controller.getPublicPlaylist(mockPlaylistId, mockUserId, '1.2.3.4')
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException from service', async () => {
      service.getPublicPlaylist.mockRejectedValue(new ForbiddenException());
      await expect(
        controller.getPublicPlaylist(mockPlaylistId, mockUserId, '1.2.3.4')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getSecretPlaylist ────────────────────────────────────────────────────

  describe('getSecretPlaylist', () => {
    const secretToken = 'abc123xyz';

    it('should delegate to service with secretToken', async () => {
      const mockResponse = { status: 'success', data: { playlistId: mockPlaylistId } };
      service.getSecretPlaylist.mockResolvedValue(mockResponse);

      const result = await controller.getSecretPlaylist(secretToken, mockIp);

      expect(service.getSecretPlaylist).toHaveBeenCalledWith(secretToken, mockIp);
      expect(result).toBe(mockResponse);
    });

    it('should propagate NotFoundException from service', async () => {
      service.getSecretPlaylist.mockRejectedValue(new NotFoundException());
      await expect(controller.getSecretPlaylist(secretToken, mockIp)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // ─── resetSecretToken ─────────────────────────────────────────────────────

  describe('resetSecretToken', () => {
    it('should delegate to service with playlistId and userId', async () => {
      const mockResponse = {
        status: 'success',
        data: { playlistId: mockPlaylistId, secretToken: 'new-tok' },
      };
      service.resetSecretToken.mockResolvedValue(mockResponse);

      const result = await controller.resetSecretToken(mockPlaylistId, mockUserId);

      expect(service.resetSecretToken).toHaveBeenCalledWith(mockPlaylistId, mockUserId);
      expect(result).toBe(mockResponse);
    });

    it('should propagate NotFoundException from service', async () => {
      service.resetSecretToken.mockRejectedValue(new NotFoundException());
      await expect(controller.resetSecretToken(mockPlaylistId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should propagate BadRequestException when playlist is public', async () => {
      service.resetSecretToken.mockRejectedValue(new BadRequestException());
      await expect(controller.resetSecretToken(mockPlaylistId, mockUserId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should propagate ForbiddenException from service', async () => {
      service.resetSecretToken.mockRejectedValue(new ForbiddenException());
      await expect(controller.resetSecretToken(mockPlaylistId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ─── getMyPlaylists ───────────────────────────────────────────────────────

  describe('getMyPlaylists', () => {
    it('should delegate to service with userId, page, and limit', async () => {
      service.getMyPlaylists.mockResolvedValue({
        status: 'success',
        data: [],
        pagination: { currentPage: 1, totalPages: 0, totalCount: 0, limit: mockLimit },
      });

      await controller.getMyPlaylists(mockUserId, mockPage, mockLimit);

      expect(service.getMyPlaylists).toHaveBeenCalledWith(
        mockUserId,
        mockPage,
        mockLimit,
        undefined
      );
      expect(service.getMyPlaylists).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        data: [{ playlistId: mockPlaylistId, title: 'My Vibe', isOwner: true }],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 1, limit: mockLimit },
      };
      service.getMyPlaylists.mockResolvedValue(mockResponse);

      const result = await controller.getMyPlaylists(mockUserId, mockPage, mockLimit);

      expect(result).toBe(mockResponse);
    });
  });

  // ─── getUserPlaylists ───────────────────────────────────────────────────────

  describe('getUserPlaylists', () => {
    it('should delegate to service with userId, myUserId, page, and limit', async () => {
      const mockResponse = {
        status: 'success',
        data: [],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 0, limit: 20 },
      };
      service.getUserPlaylists.mockResolvedValue(mockResponse);

      await controller.getUserPlaylists(mockUserId, mockMyUserId, mockPage, mockLimit);

      expect(service.getUserPlaylists).toHaveBeenCalledWith(
        mockUserId,
        mockMyUserId,
        mockPage,
        mockLimit,
        undefined
      );
      expect(service.getUserPlaylists).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        data: [{ playlistId: mockPlaylistId, title: 'Public Jams', isPublic: true }],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 1, limit: 20 },
      };
      service.getUserPlaylists.mockResolvedValue(mockResponse);

      const result = await controller.getUserPlaylists(
        mockUserId,
        mockMyUserId,
        mockPage,
        mockLimit
      );

      expect(result).toBe(mockResponse);
    });

    it('should handle unauthenticated (null) guest users viewing the profile', async () => {
      const mockResponse = {
        status: 'success',
        data: [],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 0, limit: 20 },
      };
      service.getUserPlaylists.mockResolvedValue(mockResponse);

      await controller.getUserPlaylists(mockUserId, null, mockPage, mockLimit);

      expect(service.getUserPlaylists).toHaveBeenCalledWith(
        mockUserId,
        null,
        mockPage,
        mockLimit,
        undefined
      );
    });

    it("should pass filter='playlist' to service", async () => {
      service.getUserPlaylists.mockResolvedValue({
        status: 'success',
        data: [],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 0, limit: 20 },
      });

      await controller.getUserPlaylists(mockUserId, mockMyUserId, mockPage, mockLimit, 'playlist');

      expect(service.getUserPlaylists).toHaveBeenCalledWith(
        mockUserId,
        mockMyUserId,
        mockPage,
        mockLimit,
        'playlist'
      );
    });

    it("should pass filter='station' to service", async () => {
      service.getUserPlaylists.mockResolvedValue({
        status: 'success',
        data: [],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 0, limit: 20 },
      });

      await controller.getUserPlaylists(mockUserId, mockMyUserId, mockPage, mockLimit, 'station');

      expect(service.getUserPlaylists).toHaveBeenCalledWith(
        mockUserId,
        mockMyUserId,
        mockPage,
        mockLimit,
        'station'
      );
    });

    it("should pass filter='album' to service", async () => {
      service.getUserPlaylists.mockResolvedValue({
        status: 'success',
        data: [],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 0, limit: 20 },
      });

      await controller.getUserPlaylists(mockUserId, mockMyUserId, mockPage, mockLimit, 'album');

      expect(service.getUserPlaylists).toHaveBeenCalledWith(
        mockUserId,
        mockMyUserId,
        mockPage,
        mockLimit,
        'album'
      );
    });

    it('should propagate NotFoundException when user profile does not exist', async () => {
      service.getUserPlaylists.mockRejectedValue(new NotFoundException('User not found'));

      await expect(
        controller.getUserPlaylists(mockUserId, mockMyUserId, mockPage, mockLimit)
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when the account is private and not owned by caller', async () => {
      service.getUserPlaylists.mockRejectedValue(new ForbiddenException('This account is private'));

      await expect(
        controller.getUserPlaylists(mockUserId, mockMyUserId, mockPage, mockLimit)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getMyPlaylists ─────────────────────────────────────────────────────────

  describe('getMyPlaylists', () => {
    it('should delegate to service with userId, page, and limit', async () => {
      const mockResponse = {
        status: 'success',
        data: [],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 0, limit: 20 },
      };
      service.getMyPlaylists.mockResolvedValue(mockResponse);

      await controller.getMyPlaylists(mockUserId, mockPage, mockLimit);

      expect(service.getMyPlaylists).toHaveBeenCalledWith(
        mockUserId,
        mockPage,
        mockLimit,
        undefined
      );
      expect(service.getMyPlaylists).toHaveBeenCalledTimes(1);
    });

    it("should pass filter='playlist' to service", async () => {
      service.getMyPlaylists.mockResolvedValue({
        status: 'success',
        data: [],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 0, limit: 20 },
      });

      await controller.getMyPlaylists(mockUserId, mockPage, mockLimit, 'playlist');

      expect(service.getMyPlaylists).toHaveBeenCalledWith(
        mockUserId,
        mockPage,
        mockLimit,
        'playlist'
      );
    });

    it("should pass filter='station' to service", async () => {
      service.getMyPlaylists.mockResolvedValue({
        status: 'success',
        data: [],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 0, limit: 20 },
      });

      await controller.getMyPlaylists(mockUserId, mockPage, mockLimit, 'station');

      expect(service.getMyPlaylists).toHaveBeenCalledWith(
        mockUserId,
        mockPage,
        mockLimit,
        'station'
      );
    });

    it("should pass filter='album' to service", async () => {
      service.getMyPlaylists.mockResolvedValue({
        status: 'success',
        data: [],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 0, limit: 20 },
      });

      await controller.getMyPlaylists(mockUserId, mockPage, mockLimit, 'album');

      expect(service.getMyPlaylists).toHaveBeenCalledWith(mockUserId, mockPage, mockLimit, 'album');
    });

    it('should return the service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        data: [{ playlistId: mockPlaylistId, title: 'My Secret Stash', isPublic: false }],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 1, limit: 20 },
      };
      service.getMyPlaylists.mockResolvedValue(mockResponse);

      const result = await controller.getMyPlaylists(mockUserId, mockPage, mockLimit);

      expect(result).toBe(mockResponse);
    });
  });
});
