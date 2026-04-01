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
  likeTrack: jest.fn(),
  getTrackLikesCount: jest.fn(),
  removeTrackLike: jest.fn(),
  getTrackLikes: jest.fn(),
  getUserTrackLikes: jest.fn(),
  addComment: jest.fn(),
  deleteComment: jest.fn(),
  getTrackComments: jest.fn(),
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

  // ─── likeTrack ────────────────────────────────────────────────────────────────

  describe('likeTrack', () => {
    it('should delegate to service with trackId and userId', async () => {
      service.likeTrack.mockResolvedValue({});

      await controller.likeTrack(mockTrackId, mockUserId);

      expect(service.likeTrack).toHaveBeenCalledWith(mockTrackId, mockUserId);
      expect(service.likeTrack).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        data: { trackId: mockTrackId, userId: mockUserId },
      };
      service.likeTrack.mockResolvedValue(mockResponse);

      const result = await controller.likeTrack(mockTrackId, mockUserId);

      expect(result).toEqual(mockResponse);
    });

    it('should propagate NotFoundException from service', async () => {
      service.likeTrack.mockRejectedValue(new NotFoundException('Track not found'));

      await expect(controller.likeTrack(mockTrackId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should propagate ConflictException from service', async () => {
      service.likeTrack.mockRejectedValue(new ConflictException('Already liked'));

      await expect(controller.likeTrack(mockTrackId, mockUserId)).rejects.toThrow(
        ConflictException
      );
    });

    it('should propagate ForbiddenException from service', async () => {
      service.likeTrack.mockRejectedValue(new ForbiddenException('Track is private'));

      await expect(controller.likeTrack(mockTrackId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ─── getTrackLikesCount ───────────────────────────────────────────────────────

  describe('getTrackLikesCount', () => {
    it('should delegate to service with trackId and userId', async () => {
      service.getTrackLikesCount.mockResolvedValue({
        status: 'success',
        data: { trackId: mockTrackId, likesCount: 5 },
      });

      await controller.getTrackLikessCount(mockTrackId, mockUserId);

      expect(service.getTrackLikesCount).toHaveBeenCalledWith(mockTrackId, mockUserId);
      expect(service.getTrackLikesCount).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = { status: 'success', data: { trackId: mockTrackId, likesCount: 42 } };
      service.getTrackLikesCount.mockResolvedValue(mockResponse);

      const result = await controller.getTrackLikessCount(mockTrackId, mockUserId);

      expect(result).toEqual(mockResponse);
    });

    it('should propagate NotFoundException from service', async () => {
      service.getTrackLikesCount.mockRejectedValue(new NotFoundException('Track not found'));

      await expect(controller.getTrackLikessCount(mockTrackId, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should propagate ForbiddenException from service', async () => {
      service.getTrackLikesCount.mockRejectedValue(new ForbiddenException('Access denied'));

      await expect(controller.getTrackLikessCount(mockTrackId, mockUserId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ─── removeTrackLike ──────────────────────────────────────────────────────────

  describe('removeTrackLike', () => {
    it('should delegate to service with trackId and userId', async () => {
      service.removeTrackLike.mockResolvedValue({});

      await controller.removeTrackLike(mockTrackId, mockUserId);

      expect(service.removeTrackLike).toHaveBeenCalledWith(mockTrackId, mockUserId);
      expect(service.removeTrackLike).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = { status: 'success', message: 'Track successfully unliked' };
      service.removeTrackLike.mockResolvedValue(mockResponse);

      const result = await controller.removeTrackLike(mockTrackId, mockUserId);

      expect(result).toEqual(mockResponse);
    });

    it('should propagate BadRequestException from service', async () => {
      service.removeTrackLike.mockRejectedValue(new BadRequestException('Like not found'));

      await expect(controller.removeTrackLike(mockTrackId, mockUserId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ─── getTrackLikes ────────────────────────────────────────────────────────────

  describe('getTrackLikes', () => {
    const mockPage = 1;
    const mockLimit = 10;

    it('should delegate to service with trackId, userId, page, and limit', async () => {
      service.getTrackLikes.mockResolvedValue({ status: 'success', data: [], pagination: {} });

      await controller.getTrackLikes(mockTrackId, mockUserId, mockPage, mockLimit);

      expect(service.getTrackLikes).toHaveBeenCalledWith(
        mockTrackId,
        mockUserId,
        mockPage,
        mockLimit
      );
      expect(service.getTrackLikes).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        data: [{ userId: mockUserId, likedAt: new Date() }],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 1, limit: 10 },
      };
      service.getTrackLikes.mockResolvedValue(mockResponse);

      const result = await controller.getTrackLikes(mockTrackId, mockUserId, mockPage, mockLimit);

      expect(result).toEqual(mockResponse);
    });

    it('should propagate NotFoundException from service', async () => {
      service.getTrackLikes.mockRejectedValue(new NotFoundException('Track not found'));

      await expect(
        controller.getTrackLikes(mockTrackId, mockUserId, mockPage, mockLimit)
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException from service', async () => {
      service.getTrackLikes.mockRejectedValue(new ForbiddenException('Access denied'));

      await expect(
        controller.getTrackLikes(mockTrackId, mockUserId, mockPage, mockLimit)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getUserTrackLikes ────────────────────────────────────────────────────────

  describe('getUserTrackLikes', () => {
    const mockPage = 1;
    const mockLimit = 20;

    it('should delegate to service with userId, myUserId, page, and limit', async () => {
      service.getUserTrackLikes.mockResolvedValue({ status: 'success', data: [], pagination: {} });

      await controller.getUserTrackLikes(mockUserId, mockMyUserId, mockPage, mockLimit);

      expect(service.getUserTrackLikes).toHaveBeenCalledWith(
        mockUserId,
        mockMyUserId,
        mockPage,
        mockLimit
      );
      expect(service.getUserTrackLikes).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        data: [{ trackId: mockTrackId, title: 'Midnight Drive' }],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 1, limit: 20 },
      };
      service.getUserTrackLikes.mockResolvedValue(mockResponse);

      const result = await controller.getUserTrackLikes(
        mockUserId,
        mockMyUserId,
        mockPage,
        mockLimit
      );

      expect(result).toBe(mockResponse);
    });

    it('should propagate NotFoundException from service', async () => {
      service.getUserTrackLikes.mockRejectedValue(new NotFoundException('User not found'));

      await expect(
        controller.getUserTrackLikes(mockUserId, mockMyUserId, mockPage, mockLimit)
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException from service', async () => {
      service.getUserTrackLikes.mockRejectedValue(
        new ForbiddenException('This account is private')
      );

      await expect(
        controller.getUserTrackLikes(mockUserId, mockMyUserId, mockPage, mockLimit)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── comment ──────────────────────────────────────────────────────────────────

  describe('comment', () => {
    const mockCommentId = '660e8400-e29b-41d4-a716-446655440010';
    const mockParentCommentId = '660e8400-e29b-41d4-a716-446655440011';
    const mockDto = { content: 'Great track!', timestampSeconds: 56 };
    const mockDtoWithParent = {
      content: 'Nice reply!',
      timestampSeconds: 30,
      parentId: mockParentCommentId,
    };
    const mockCommentResponse = () => ({
      status: 'success',
      data: {
        commentId: mockCommentId,
        trackId: mockTrackId,
        userId: mockUserId,
        content: 'Great track!',
        timestampSeconds: 56,
        parentId: null,
        createdAt: new Date('2024-06-01T12:00:00Z'),
      },
    });

    it('should delegate to service with trackId, userId, and dto', async () => {
      service.addComment.mockResolvedValue(mockCommentResponse());

      await controller.comment(mockTrackId, mockUserId, mockDto as any);

      expect(service.addComment).toHaveBeenCalledWith(mockTrackId, mockUserId, mockDto);
      expect(service.addComment).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = mockCommentResponse();
      service.addComment.mockResolvedValue(mockResponse);

      const result = await controller.comment(mockTrackId, mockUserId, mockDto as any);

      expect(result).toBe(mockResponse);
    });

    it('should pass parentId to service when provided', async () => {
      const replyResponse = {
        status: 'success',
        data: { ...mockCommentResponse().data, parentId: mockParentCommentId },
      };
      service.addComment.mockResolvedValue(replyResponse);

      await controller.comment(mockTrackId, mockUserId, mockDtoWithParent as any);

      expect(service.addComment).toHaveBeenCalledWith(mockTrackId, mockUserId, mockDtoWithParent);
    });

    it('should propagate NotFoundException when track not found', async () => {
      service.addComment.mockRejectedValue(new NotFoundException('Track not found'));

      await expect(controller.comment(mockTrackId, mockUserId, mockDto as any)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should propagate ForbiddenException when track is private', async () => {
      service.addComment.mockRejectedValue(new ForbiddenException('This track is private'));

      await expect(controller.comment(mockTrackId, mockUserId, mockDto as any)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should propagate NotFoundException when parent comment not found', async () => {
      service.addComment.mockRejectedValue(new NotFoundException('Parent comment not found'));

      await expect(
        controller.comment(mockTrackId, mockUserId, mockDtoWithParent as any)
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deleteComment ────────────────────────────────────────────────────────────

  describe('deleteComment', () => {
    const mockCommentId = '660e8400-e29b-41d4-a716-446655440010';

    it('should delegate to service with trackId, commentId, and userId', async () => {
      service.deleteComment.mockResolvedValue({
        status: 'success',
        message: 'comment deleted successfully',
      });

      await controller.deleteComment(mockTrackId, mockCommentId, mockUserId);

      expect(service.deleteComment).toHaveBeenCalledWith(mockTrackId, mockCommentId, mockUserId);
      expect(service.deleteComment).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = { status: 'success', message: 'comment deleted successfully' };
      service.deleteComment.mockResolvedValue(mockResponse);

      const result = await controller.deleteComment(mockTrackId, mockCommentId, mockUserId);

      expect(result).toBe(mockResponse);
    });

    it('should propagate NotFoundException when track or comment not found', async () => {
      service.deleteComment.mockRejectedValue(new NotFoundException('Comment not found'));

      await expect(
        controller.deleteComment(mockTrackId, mockCommentId, mockUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when not the comment author', async () => {
      service.deleteComment.mockRejectedValue(
        new ForbiddenException('You are not authorized to delete this comment')
      );

      await expect(
        controller.deleteComment(mockTrackId, mockCommentId, mockUserId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should propagate ConflictException when comment does not belong to track', async () => {
      service.deleteComment.mockRejectedValue(
        new ConflictException('This comment does not belong to this track')
      );

      await expect(
        controller.deleteComment(mockTrackId, mockCommentId, mockUserId)
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── getTrackComments ─────────────────────────────────────────────────────────

  describe('getTrackComments', () => {
    const mockPage = 1;
    const mockLimit = 20;

    it('should delegate to service with all params', async () => {
      service.getTrackComments.mockResolvedValue({
        status: 'success',
        data: [],
        pagination: { currentPage: 1, totalPages: 0, totalCount: 0, limit: mockLimit },
      });

      await controller.getTrackComments(mockTrackId, mockUserId, mockPage, mockLimit, 'timestamp');

      expect(service.getTrackComments).toHaveBeenCalledWith(
        mockTrackId,
        mockUserId,
        mockPage,
        mockLimit,
        'timestamp'
      );
      expect(service.getTrackComments).toHaveBeenCalledTimes(1);
    });

    it('should return the service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        data: [
          {
            commentId: '660e8400-e29b-41d4-a716-446655440010',
            content: 'Great!',
            timestampSeconds: 56,
            user: { userId: mockUserId, username: 'user' },
            createdAt: new Date(),
          },
        ],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 1, limit: mockLimit },
      };
      service.getTrackComments.mockResolvedValue(mockResponse);

      const result = await controller.getTrackComments(
        mockTrackId,
        mockUserId,
        mockPage,
        mockLimit,
        'newest'
      );

      expect(result).toBe(mockResponse);
    });

    it('should propagate NotFoundException when track not found', async () => {
      service.getTrackComments.mockRejectedValue(new NotFoundException('Track not found'));

      await expect(
        controller.getTrackComments(mockTrackId, mockUserId, mockPage, mockLimit, 'oldest')
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when track is private', async () => {
      service.getTrackComments.mockRejectedValue(new ForbiddenException('This track is private'));

      await expect(
        controller.getTrackComments(mockTrackId, mockUserId, mockPage, mockLimit, 'timestamp')
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
