import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TrackController } from './track.controller';
import { TrackService } from './track.service';
import { TrackSseService } from './services/track-sse.service';
import { NoBlockGuard } from '../followers/guards/no-block.guard';
import {
  MOCK_TRACK_ID,
  MOCK_USER_ID,
  MOCK_MY_USER_ID,
  MOCK_OTHER_USER_ID,
  mockJwtPayload,
  mockProJwtPayload,
  mockPublicTrack,
} from './tests/track.mock';

const MOCK_CAPTION = 'Great track!';

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
  getTrack: jest.fn(),
  getTrackAudio: jest.fn(),
  updateBlockedRegions: jest.fn(),
  getAllGenres: jest.fn(),
  getUserUploadedTracks: jest.fn(),
  getUserQuota: jest.fn(),
  getTrackPlaylists: jest.fn(),
});

describe('TrackController', () => {
  let controller: TrackController;
  let service: ReturnType<typeof mockTrackService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrackController],
      providers: [
        { provide: TrackService, useFactory: mockTrackService },
        { provide: TrackSseService, useValue: {} },
      ],
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
    it('should delegate to service with correct args', async () => {
      service.repostTrack.mockResolvedValue({});

      await controller.repostTrack(MOCK_TRACK_ID, MOCK_USER_ID, MOCK_CAPTION);

      expect(service.repostTrack).toHaveBeenCalledWith(MOCK_TRACK_ID, MOCK_USER_ID, MOCK_CAPTION);
    });

    it('should return service response as-is', async () => {
      const mockResponse = { status: 'success', data: {} };
      service.repostTrack.mockResolvedValue(mockResponse);

      expect(await controller.repostTrack(MOCK_TRACK_ID, MOCK_USER_ID, MOCK_CAPTION)).toBe(
        mockResponse
      );
    });

    it('should propagate NotFoundException', async () => {
      service.repostTrack.mockRejectedValue(new NotFoundException());

      await expect(
        controller.repostTrack(MOCK_TRACK_ID, MOCK_USER_ID, MOCK_CAPTION)
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ConflictException', async () => {
      service.repostTrack.mockRejectedValue(new ConflictException());

      await expect(
        controller.repostTrack(MOCK_TRACK_ID, MOCK_USER_ID, MOCK_CAPTION)
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── getTrackRepostsCount ─────────────────────────────────────────────────────

  describe('getTrackRepostsCount', () => {
    it('should delegate to service', async () => {
      service.getTrackRepostsCount.mockResolvedValue({
        status: 'success',
        data: { repostsCount: 5 },
      });

      await controller.getTrackRepostsCount(MOCK_TRACK_ID, MOCK_USER_ID);

      expect(service.getTrackRepostsCount).toHaveBeenCalledWith(MOCK_TRACK_ID, MOCK_USER_ID);
    });

    it('should propagate ForbiddenException', async () => {
      service.getTrackRepostsCount.mockRejectedValue(new ForbiddenException());

      await expect(controller.getTrackRepostsCount(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ─── removeTrackRepost ────────────────────────────────────────────────────────

  describe('removeTrackRepost', () => {
    it('should delegate to service', async () => {
      service.removeTrackRepost.mockResolvedValue({});

      await controller.removeTrackRepost(MOCK_TRACK_ID, MOCK_USER_ID);

      expect(service.removeTrackRepost).toHaveBeenCalledWith(MOCK_TRACK_ID, MOCK_USER_ID);
    });

    it('should propagate BadRequestException', async () => {
      service.removeTrackRepost.mockRejectedValue(new BadRequestException());

      await expect(controller.removeTrackRepost(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ─── editTrackRepost ──────────────────────────────────────────────────────────

  describe('editTrackRepost', () => {
    it('should delegate to service', async () => {
      service.editTrackRepost.mockResolvedValue({});

      await controller.editTrackRepost(MOCK_TRACK_ID, MOCK_USER_ID, MOCK_CAPTION);

      expect(service.editTrackRepost).toHaveBeenCalledWith(
        MOCK_TRACK_ID,
        MOCK_USER_ID,
        MOCK_CAPTION
      );
    });
  });

  // ─── getTrackReposts ──────────────────────────────────────────────────────────

  describe('getTrackReposts', () => {
    it('should delegate to service with all params', async () => {
      service.getTrackReposts.mockResolvedValue({ status: 'success', data: [] });

      await controller.getTrackReposts(MOCK_TRACK_ID, MOCK_USER_ID, 1, 20);

      expect(service.getTrackReposts).toHaveBeenCalledWith(MOCK_TRACK_ID, MOCK_USER_ID, 1, 20);
    });

    it('should propagate ForbiddenException', async () => {
      service.getTrackReposts.mockRejectedValue(new ForbiddenException());

      await expect(controller.getTrackReposts(MOCK_TRACK_ID, MOCK_USER_ID, 1, 20)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ─── getUserTrackReposts ──────────────────────────────────────────────────────

  describe('getUserTrackReposts', () => {
    it('should delegate to service', async () => {
      service.getUserTrackReposts.mockResolvedValue({ status: 'success', data: [] });

      await controller.getUserTrackReposts(MOCK_USER_ID, MOCK_MY_USER_ID, 1, 20);

      expect(service.getUserTrackReposts).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_MY_USER_ID,
        1,
        20
      );
    });
  });

  // ─── likeTrack ────────────────────────────────────────────────────────────────

  describe('likeTrack', () => {
    it('should delegate to service', async () => {
      service.likeTrack.mockResolvedValue({});

      await controller.likeTrack(MOCK_TRACK_ID, MOCK_USER_ID);

      expect(service.likeTrack).toHaveBeenCalledWith(MOCK_TRACK_ID, MOCK_USER_ID);
    });

    it('should propagate ConflictException', async () => {
      service.likeTrack.mockRejectedValue(new ConflictException());

      await expect(controller.likeTrack(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow(
        ConflictException
      );
    });
  });

  // ─── getTrackLikesCount ───────────────────────────────────────────────────────

  describe('getTrackLikesCount', () => {
    it('should delegate to service', async () => {
      service.getTrackLikesCount.mockResolvedValue({});

      await controller.getTrackLikessCount(MOCK_TRACK_ID, MOCK_USER_ID);

      expect(service.getTrackLikesCount).toHaveBeenCalledWith(MOCK_TRACK_ID, MOCK_USER_ID);
    });
  });

  // ─── removeTrackLike ──────────────────────────────────────────────────────────

  describe('removeTrackLike', () => {
    it('should delegate to service', async () => {
      service.removeTrackLike.mockResolvedValue({});

      await controller.removeTrackLike(MOCK_TRACK_ID, MOCK_USER_ID);

      expect(service.removeTrackLike).toHaveBeenCalledWith(MOCK_TRACK_ID, MOCK_USER_ID);
    });
  });

  // ─── getTrackLikes ────────────────────────────────────────────────────────────

  describe('getTrackLikes', () => {
    it('should delegate to service', async () => {
      service.getTrackLikes.mockResolvedValue({ status: 'success', data: [] });

      await controller.getTrackLikes(MOCK_TRACK_ID, MOCK_USER_ID, 1, 20);

      expect(service.getTrackLikes).toHaveBeenCalledWith(MOCK_TRACK_ID, MOCK_USER_ID, 1, 20);
    });
  });

  // ─── getUserTrackLikes ────────────────────────────────────────────────────────

  describe('getUserTrackLikes', () => {
    it('should delegate to service', async () => {
      service.getUserTrackLikes.mockResolvedValue({ status: 'success', data: [] });

      await controller.getUserTrackLikes(MOCK_USER_ID, MOCK_MY_USER_ID, 1, 20);

      expect(service.getUserTrackLikes).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_MY_USER_ID, 1, 20);
    });
  });

  // ─── comment ──────────────────────────────────────────────────────────────────

  describe('comment', () => {
    const mockDto = { content: 'Great!', timestampSeconds: 56 } as any;

    it('should delegate to service', async () => {
      service.addComment.mockResolvedValue({});

      await controller.comment(MOCK_TRACK_ID, MOCK_USER_ID, mockDto);

      expect(service.addComment).toHaveBeenCalledWith(MOCK_TRACK_ID, MOCK_USER_ID, mockDto);
    });

    it('should propagate ForbiddenException', async () => {
      service.addComment.mockRejectedValue(new ForbiddenException());

      await expect(controller.comment(MOCK_TRACK_ID, MOCK_USER_ID, mockDto)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ─── deleteComment ────────────────────────────────────────────────────────────

  describe('deleteComment', () => {
    const MOCK_COMMENT_ID = '660e8400-e29b-41d4-a716-446655440010';

    it('should delegate to service', async () => {
      service.deleteComment.mockResolvedValue({});

      await controller.deleteComment(MOCK_TRACK_ID, MOCK_COMMENT_ID, MOCK_USER_ID);

      expect(service.deleteComment).toHaveBeenCalledWith(
        MOCK_TRACK_ID,
        MOCK_COMMENT_ID,
        MOCK_USER_ID
      );
    });

    it('should propagate ConflictException', async () => {
      service.deleteComment.mockRejectedValue(new ConflictException());

      await expect(
        controller.deleteComment(MOCK_TRACK_ID, MOCK_COMMENT_ID, MOCK_USER_ID)
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── getTrackComments ─────────────────────────────────────────────────────────

  describe('getTrackComments', () => {
    it('should delegate to service with all params', async () => {
      service.getTrackComments.mockResolvedValue({ status: 'success', data: [] });

      await controller.getTrackComments(MOCK_TRACK_ID, MOCK_USER_ID, 1, 20, 'timestamp');

      expect(service.getTrackComments).toHaveBeenCalledWith(
        MOCK_TRACK_ID,
        MOCK_USER_ID,
        1,
        20,
        'timestamp'
      );
    });

    it('should propagate ForbiddenException', async () => {
      service.getTrackComments.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.getTrackComments(MOCK_TRACK_ID, MOCK_USER_ID, 1, 20, 'timestamp')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getTrack ─────────────────────────────────────────────────────────────────

  describe('getTrack', () => {
    it('should delegate to service with trackId, user, and ip', async () => {
      service.getTrack.mockResolvedValue({ status: 'success', data: {} });
      const user = mockJwtPayload();

      await controller.getTrack(MOCK_TRACK_ID, user, '1.2.3.4');

      expect(service.getTrack).toHaveBeenCalledWith(MOCK_TRACK_ID, user, '1.2.3.4');
    });

    it('should work without user (public access)', async () => {
      service.getTrack.mockResolvedValue({ status: 'success', data: {} });

      await controller.getTrack(MOCK_TRACK_ID, undefined, '1.2.3.4');

      expect(service.getTrack).toHaveBeenCalledWith(MOCK_TRACK_ID, undefined, '1.2.3.4');
    });

    it('should return service response as-is', async () => {
      const mockResponse = { status: 'success', data: { trackId: MOCK_TRACK_ID } };
      service.getTrack.mockResolvedValue(mockResponse);

      expect(await controller.getTrack(MOCK_TRACK_ID)).toBe(mockResponse);
    });

    it('should propagate ForbiddenException', async () => {
      service.getTrack.mockRejectedValue(new ForbiddenException());

      await expect(controller.getTrack(MOCK_TRACK_ID)).rejects.toThrow(ForbiddenException);
    });

    it('should propagate NotFoundException', async () => {
      service.getTrack.mockRejectedValue(new NotFoundException());

      await expect(controller.getTrack(MOCK_TRACK_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getTrackAudio ────────────────────────────────────────────────────────────

  describe('getTrackAudio', () => {
    it('should delegate to service with trackId and user', async () => {
      service.getTrackAudio.mockResolvedValue({ status: 'success', data: {} });
      const user = mockProJwtPayload();

      await controller.getTrackAudio(MOCK_TRACK_ID, user);

      expect(service.getTrackAudio).toHaveBeenCalledWith(MOCK_TRACK_ID, user);
    });

    it('should work without user', async () => {
      service.getTrackAudio.mockResolvedValue({ status: 'success', data: {} });

      await controller.getTrackAudio(MOCK_TRACK_ID, undefined);

      expect(service.getTrackAudio).toHaveBeenCalledWith(MOCK_TRACK_ID, undefined);
    });

    it('should propagate ConflictException when track still processing', async () => {
      service.getTrackAudio.mockRejectedValue(new ConflictException());

      await expect(controller.getTrackAudio(MOCK_TRACK_ID)).rejects.toThrow(ConflictException);
    });
  });

  // ─── updateBlockedRegions ─────────────────────────────────────────────────────

  describe('updateBlockedRegions', () => {
    const dto = { blockedRegions: ['EG', 'US'] };

    it('should delegate to service with trackId, userId, and dto', async () => {
      service.updateBlockedRegions.mockResolvedValue({ status: 'success', data: {} });

      await controller.updateBlockedRegions(MOCK_TRACK_ID, MOCK_USER_ID, dto);

      expect(service.updateBlockedRegions).toHaveBeenCalledWith(MOCK_TRACK_ID, MOCK_USER_ID, dto);
    });

    it('should return service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        data: { trackId: MOCK_TRACK_ID, blockedRegions: ['EG'] },
      };
      service.updateBlockedRegions.mockResolvedValue(mockResponse);

      expect(await controller.updateBlockedRegions(MOCK_TRACK_ID, MOCK_USER_ID, dto)).toBe(
        mockResponse
      );
    });

    it('should propagate ForbiddenException when not owner', async () => {
      service.updateBlockedRegions.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.updateBlockedRegions(MOCK_TRACK_ID, MOCK_USER_ID, dto)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getAllGenres ─────────────────────────────────────────────────────────────

  describe('getAllGenres', () => {
    it('should delegate to service', async () => {
      service.getAllGenres.mockResolvedValue({ status: 'success', data: [] });

      await controller.getAllGenres();

      expect(service.getAllGenres).toHaveBeenCalledTimes(1);
    });

    it('should return service response as-is', async () => {
      const mockResponse = { status: 'success', data: [{ genreId: 'id', name: 'Electronic' }] };
      service.getAllGenres.mockResolvedValue(mockResponse);

      expect(await controller.getAllGenres()).toBe(mockResponse);
    });
  });

  // Extra tests added to increase coverage for upload/reupload and SSE
  describe('uploadTrack and reupload validations and SSE', () => {
    it('uploadTrack should throw BadRequest when audio missing', async () => {
      await expect(controller.uploadTrack(MOCK_USER_ID, {} as any, undefined!)).rejects.toThrow(
        BadRequestException
      );
    });

    it('reuploadTrackAudio should throw BadRequest when audio missing', async () => {
      await expect(
        controller.reuploadTrackAudio(MOCK_TRACK_ID, MOCK_USER_ID, undefined as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('streamTrackStatus should emit completed when track finished', async () => {
      (service as any).getTrackById = jest.fn().mockResolvedValue(mockPublicTrack());
      const ev = await firstValueFrom(controller.streamTrackStatus(MOCK_TRACK_ID));
      expect(ev.data.event).toBe('completed');
      expect(ev.data.data.trackId).toBe(MOCK_TRACK_ID);
    });
  });

  // ─── getUserUploadedTracks ────────────────────────────────────────────────────

  describe('getUserUploadedTracks', () => {
    it('should delegate to service with all params', async () => {
      service.getUserUploadedTracks.mockResolvedValue({ status: 'success', data: [] });

      await controller.getUserUploadedTracks(MOCK_OTHER_USER_ID, MOCK_USER_ID, 1, 20);

      expect(service.getUserUploadedTracks).toHaveBeenCalledWith(
        MOCK_OTHER_USER_ID,
        MOCK_USER_ID,
        1,
        20
      );
    });

    it('should propagate ForbiddenException for private account', async () => {
      service.getUserUploadedTracks.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.getUserUploadedTracks(MOCK_OTHER_USER_ID, MOCK_USER_ID, 1, 20)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getTrackPlaylists ────────────────────────────────────────────────────────

  describe('getTrackPlaylists', () => {
    it('should delegate to service with trackId, userId, page, and limit', async () => {
      service.getTrackPlaylists.mockResolvedValue({ status: 'success', data: [] });

      await controller.getTrackPlaylists(MOCK_TRACK_ID, MOCK_USER_ID, 1, 20);

      expect(service.getTrackPlaylists).toHaveBeenCalledWith(MOCK_TRACK_ID, MOCK_USER_ID, 1, 20);
    });

    it('should return service response as-is', async () => {
      const mockResponse = { status: 'success', data: [{ playlistId: 'id' }] };
      service.getTrackPlaylists.mockResolvedValue(mockResponse);

      expect(await controller.getTrackPlaylists(MOCK_TRACK_ID, MOCK_USER_ID, 1, 20)).toBe(
        mockResponse
      );
    });

    it('should propagate ForbiddenException for private track', async () => {
      service.getTrackPlaylists.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.getTrackPlaylists(MOCK_TRACK_ID, MOCK_USER_ID, 1, 20)
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
