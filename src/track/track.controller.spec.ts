import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TrackController } from './track.controller';
import { TrackService } from './track.service';
import { NoBlockGuard } from '../followers/guards/no-block.guard';

const mockTrackId = '123e4567-e89b-12d3-a456-426614174000';
const mockUserId = '550e8400-e29b-41d4-a716-446655440001';
const mockMyUserId = '550e8400-e29b-41d4-a716-446655440002';
const mockCaption = 'Great track!';

const mockTrackService = () => ({
  repostTrack: jest.fn(),
  getTrackRepostsCount: jest.fn(),
  removeTrackRepost: jest.fn(),
  editTrackRepost: jest.fn(),
  getTrackReposts: jest.fn(),
  getUserTrackReposts: jest.fn(),
});

describe('TrackController', () => {
  let controller: TrackController;
  let service: ReturnType<typeof mockTrackService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrackController],
      providers: [{ provide: TrackService, useFactory: mockTrackService }],
    })
      .overrideGuard(NoBlockGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(TrackController);
    service = module.get(TrackService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── repostTrack ──────────────────────────────────────────────────────────────

  describe('repostTrack', () => {
    it('should delegate to service with trackId, userId, and caption', async () => {
      service.repostTrack.mockResolvedValue({});

      await controller.repostTrack(mockTrackId, mockUserId, mockCaption);

      expect(service.repostTrack).toHaveBeenCalledWith(mockTrackId, mockUserId, mockCaption);
      expect(service.repostTrack).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = {
        id: 'repost-1',
        trackId: mockTrackId,
        userId: mockUserId,
        caption: mockCaption,
      };
      service.repostTrack.mockResolvedValue(mockResponse);

      const result = await controller.repostTrack(mockTrackId, mockUserId, mockCaption);

      expect(result).toEqual(mockResponse);
    });

    it('should work without caption (caption is undefined)', async () => {
      service.repostTrack.mockResolvedValue({});

      await controller.repostTrack(mockTrackId, mockUserId, undefined as any);

      expect(service.repostTrack).toHaveBeenCalledWith(mockTrackId, mockUserId, undefined);
    });

    it('should propagate NotFoundException from service', async () => {
      service.repostTrack.mockRejectedValue(new NotFoundException('Track not found'));

      await expect(controller.repostTrack(mockTrackId, mockUserId, mockCaption)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should propagate ConflictException from service', async () => {
      service.repostTrack.mockRejectedValue(new ConflictException('Already reposted'));

      await expect(controller.repostTrack(mockTrackId, mockUserId, mockCaption)).rejects.toThrow(
        ConflictException
      );
    });
  });

  // ─── getTrackRepostsCount ─────────────────────────────────────────────────────

  describe('getTrackRepostsCount', () => {
    it('should delegate to service with trackId and userId', async () => {
      service.getTrackRepostsCount.mockResolvedValue({ count: 5 });

      await controller.getTrackRepostsCount(mockTrackId, mockUserId);

      expect(service.getTrackRepostsCount).toHaveBeenCalledWith(mockTrackId, mockUserId);
      expect(service.getTrackRepostsCount).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = { count: 42 };
      service.getTrackRepostsCount.mockResolvedValue(mockResponse);

      const result = await controller.getTrackRepostsCount(mockTrackId, mockUserId);

      expect(result).toEqual(mockResponse);
    });

    it('should propagate NotFoundException from service', async () => {
      service.getTrackRepostsCount.mockRejectedValue(new NotFoundException('Track not found'));

      await expect(controller.getTrackRepostsCount(mockTrackId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should propagate ForbiddenException from service', async () => {
      service.getTrackRepostsCount.mockRejectedValue(new ForbiddenException('Access denied'));

      await expect(controller.getTrackRepostsCount(mockTrackId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ─── removeTrackRepost ────────────────────────────────────────────────────────

  describe('removeTrackRepost', () => {
    it('should delegate to service with trackId and userId', async () => {
      service.removeTrackRepost.mockResolvedValue({});

      await controller.removeTrackRepost(mockTrackId, mockUserId);

      expect(service.removeTrackRepost).toHaveBeenCalledWith(mockTrackId, mockUserId);
      expect(service.removeTrackRepost).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = { message: 'Repost removed successfully' };
      service.removeTrackRepost.mockResolvedValue(mockResponse);

      const result = await controller.removeTrackRepost(mockTrackId, mockUserId);

      expect(result).toEqual(mockResponse);
    });

    it('should propagate BadRequestException from service', async () => {
      service.removeTrackRepost.mockRejectedValue(new BadRequestException('Repost not found'));

      await expect(controller.removeTrackRepost(mockTrackId, mockUserId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ─── editTrackRepost ──────────────────────────────────────────────────────────

  describe('editTrackRepost', () => {
    it('should delegate to service with trackId, userId, and caption', async () => {
      service.editTrackRepost.mockResolvedValue({});

      await controller.editTrackRepost(mockTrackId, mockUserId, mockCaption);

      expect(service.editTrackRepost).toHaveBeenCalledWith(mockTrackId, mockUserId, mockCaption);
      expect(service.editTrackRepost).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = { id: 'repost-1', caption: mockCaption };
      service.editTrackRepost.mockResolvedValue(mockResponse);

      const result = await controller.editTrackRepost(mockTrackId, mockUserId, mockCaption);

      expect(result).toEqual(mockResponse);
    });

    it('should propagate BadRequestException from service', async () => {
      service.editTrackRepost.mockRejectedValue(new BadRequestException('Repost not found'));

      await expect(
        controller.editTrackRepost(mockTrackId, mockUserId, mockCaption)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getTrackReposts ──────────────────────────────────────────────────────────

  describe('getTrackReposts', () => {
    const mockPage = 1;
    const mockLimit = 10;

    it('should delegate to service with trackId, userId, page, and limit', async () => {
      service.getTrackReposts.mockResolvedValue({ data: [], total: 0 });

      await controller.getTrackReposts(mockTrackId, mockUserId, mockPage, mockLimit);

      expect(service.getTrackReposts).toHaveBeenCalledWith(
        mockTrackId,
        mockUserId,
        mockPage,
        mockLimit
      );
      expect(service.getTrackReposts).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = {
        data: [{ id: 'repost-1', userId: mockUserId, caption: mockCaption }],
        total: 1,
      };
      service.getTrackReposts.mockResolvedValue(mockResponse);

      const result = await controller.getTrackReposts(mockTrackId, mockUserId, mockPage, mockLimit);

      expect(result).toEqual(mockResponse);
    });

    it('should propagate NotFoundException from service', async () => {
      service.getTrackReposts.mockRejectedValue(new NotFoundException('Track not found'));

      await expect(
        controller.getTrackReposts(mockTrackId, mockUserId, mockPage, mockLimit)
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException from service', async () => {
      service.getTrackReposts.mockRejectedValue(new ForbiddenException('Access denied'));

      await expect(
        controller.getTrackReposts(mockTrackId, mockUserId, mockPage, mockLimit)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getUserTrackReposts ──────────────────────────────────────────────────────

  describe('getUserTrackReposts', () => {
    const mockPage = 1;
    const mockLimit = 20;

    it('should delegate to service with userId, myUserId, page, and limit', async () => {
      service.getUserTrackReposts.mockResolvedValue({ data: [], pagination: {} });

      await controller.getUserTrackReposts(mockUserId, mockMyUserId, mockPage, mockLimit);

      expect(service.getUserTrackReposts).toHaveBeenCalledWith(
        mockUserId,
        mockMyUserId,
        mockPage,
        mockLimit
      );
      expect(service.getUserTrackReposts).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = {
        data: [{ trackId: mockTrackId, title: 'Midnight Drive' }],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 1, limit: 20 },
      };
      service.getUserTrackReposts.mockResolvedValue(mockResponse);

      const result = await controller.getUserTrackReposts(
        mockUserId,
        mockMyUserId,
        mockPage,
        mockLimit
      );

      expect(result).toBe(mockResponse);
    });

    it('should propagate NotFoundException from service', async () => {
      service.getUserTrackReposts.mockRejectedValue(new NotFoundException('User not found'));

      await expect(
        controller.getUserTrackReposts(mockUserId, mockMyUserId, mockPage, mockLimit)
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException from service', async () => {
      service.getUserTrackReposts.mockRejectedValue(
        new ForbiddenException('This account is private')
      );

      await expect(
        controller.getUserTrackReposts(mockUserId, mockMyUserId, mockPage, mockLimit)
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
