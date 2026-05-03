import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom, of } from 'rxjs';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TrackController } from './track.controller';
import { TrackService } from './track.service';
import { TrackSseService } from './services/track-sse.service';
import { AddCommentDto } from './dto/add-comment.dto';
import { UploadTrackDto } from './dto/upload-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { ScheduleReleaseDto } from './dto/schedule-release.dto';
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
  uploadTrack: jest.fn(),
  updateTrackMetadata: jest.fn(),
  reuploadTrackAudio: jest.fn(),
  getTrackById: jest.fn(),
  playTrack: jest.fn(),
  getTopFans: jest.fn(),
  getFirstFans: jest.fn(),
  deleteTrack: jest.fn(),
  getRelatedTracks: jest.fn(),
  getAllTimeStats: jest.fn(),
  getTopListeners: jest.fn(),
  getTopRegions: jest.fn(),
  getTopPlaylistsAndAlbums: jest.fn(),
  updateTrackCommentSettings: jest.fn(),
  getUserSpotlightTacks: jest.fn(),
  addToSpotlight: jest.fn(),
  updateSpotlightTracks: jest.fn(),
  scheduleRelease: jest.fn(),
});

jest.mock('meilisearch', () => ({
  Meilisearch: jest.fn().mockImplementation(() => ({
    index: jest.fn().mockReturnValue({
      addDocuments: jest.fn(),
      search: jest.fn(),
    }),
  })),
}));

describe('TrackController', () => {
  let controller: TrackController;
  let service: ReturnType<typeof mockTrackService>;
  let sseService: { getStream: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrackController],
      providers: [
        { provide: TrackService, useFactory: mockTrackService },
        { provide: TrackSseService, useValue: { getStream: jest.fn() } },
      ],
    })
      .overrideGuard(NoBlockGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(TrackController);
    service = module.get(TrackService);
    sseService = module.get(TrackSseService);
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
    const mockDto = { content: 'Great!', timestampSeconds: 56 } as AddCommentDto;

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
      await expect(
        controller.uploadTrack(MOCK_USER_ID, {} as UploadTrackDto, undefined!)
      ).rejects.toThrow(BadRequestException);
    });

    it('reuploadTrackAudio should throw BadRequest when audio missing', async () => {
      await expect(
        controller.reuploadTrackAudio(MOCK_TRACK_ID, MOCK_USER_ID, undefined)
      ).rejects.toThrow(BadRequestException);
    });

    it('streamTrackStatus should emit completed when track finished', async () => {
      service.getTrackById.mockResolvedValue(mockPublicTrack());
      const ev = await firstValueFrom(controller.streamTrackStatus(MOCK_TRACK_ID));
      expect(ev.data.event).toBe('completed');
      expect(ev.data.data.trackId).toBe(MOCK_TRACK_ID);
    });
  });

  // ─── getUserUploadedTracks ────────────────────────────────────────────────────

  describe('getUserUploadedTracks', () => {
    it('should delegate to service with all params', async () => {
      service.getUserUploadedTracks.mockResolvedValue({ status: 'success', data: [] });

      await controller.getUserUploadedTracks(MOCK_OTHER_USER_ID, MOCK_USER_ID, 1, 20, undefined);

      expect(service.getUserUploadedTracks).toHaveBeenCalledWith(
        MOCK_OTHER_USER_ID,
        MOCK_USER_ID,
        1,
        20,
        undefined
      );
    });

    it('should propagate ForbiddenException for private account', async () => {
      service.getUserUploadedTracks.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.getUserUploadedTracks(MOCK_OTHER_USER_ID, MOCK_USER_ID, 1, 20, undefined)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getTrackPlaylists ────────────────────────────────────────────────────────

  describe('getTrackPlaylists', () => {
    it('should delegate to service with trackId, userId, page, and limit', async () => {
      service.getTrackPlaylists.mockResolvedValue({ status: 'success', data: [] });

      await controller.getTrackPlaylists(MOCK_TRACK_ID, MOCK_USER_ID, 1, 20);

      expect(service.getTrackPlaylists).toHaveBeenCalledWith(
        MOCK_TRACK_ID,
        MOCK_USER_ID,
        1,
        20,
        undefined
      );
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

    it("should pass filter='playlist' to service", async () => {
      service.getTrackPlaylists.mockResolvedValue({ status: 'success', data: [] });

      await controller.getTrackPlaylists(MOCK_TRACK_ID, MOCK_USER_ID, 1, 20, 'playlist');

      expect(service.getTrackPlaylists).toHaveBeenCalledWith(
        MOCK_TRACK_ID,
        MOCK_USER_ID,
        1,
        20,
        'playlist'
      );
    });

    it("should pass filter='station' to service", async () => {
      service.getTrackPlaylists.mockResolvedValue({ status: 'success', data: [] });

      await controller.getTrackPlaylists(MOCK_TRACK_ID, MOCK_USER_ID, 1, 20, 'station');

      expect(service.getTrackPlaylists).toHaveBeenCalledWith(
        MOCK_TRACK_ID,
        MOCK_USER_ID,
        1,
        20,
        'station'
      );
    });

    it("should pass filter='album' to service", async () => {
      service.getTrackPlaylists.mockResolvedValue({ status: 'success', data: [] });

      await controller.getTrackPlaylists(MOCK_TRACK_ID, MOCK_USER_ID, 1, 20, 'album');

      expect(service.getTrackPlaylists).toHaveBeenCalledWith(
        MOCK_TRACK_ID,
        MOCK_USER_ID,
        1,
        20,
        'album'
      );
    });
  });

  // ─── uploadTrack ─────────────────────────────────────────────────────────────

  describe('uploadTrack', () => {
    const mockAudioFile = {
      originalname: 'track.mp3',
      mimetype: 'audio/mpeg',
      buffer: Buffer.from('audio'),
    } as Express.Multer.File;

    it('should delegate audio and dto to service', async () => {
      const dto = { title: 'Midnight Drive' };
      service.uploadTrack.mockResolvedValue({
        status: 'success',
        data: { trackId: MOCK_TRACK_ID },
      });

      await controller.uploadTrack(MOCK_USER_ID, dto as UploadTrackDto, { audio: [mockAudioFile] });

      expect(service.uploadTrack).toHaveBeenCalledWith(MOCK_USER_ID, dto, mockAudioFile, undefined);
    });

    it('should throw BadRequestException when no audio file provided', async () => {
      await expect(controller.uploadTrack(MOCK_USER_ID, {} as UploadTrackDto, {})).rejects.toThrow(
        BadRequestException
      );
    });

    it('should pass cover file to service when present', async () => {
      const coverFile = {
        originalname: 'cover.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('img'),
      } as Express.Multer.File;
      service.uploadTrack.mockResolvedValue({ status: 'success', data: {} });

      await controller.uploadTrack(MOCK_USER_ID, {} as UploadTrackDto, {
        audio: [mockAudioFile],
        cover: [coverFile],
      });

      expect(service.uploadTrack).toHaveBeenCalledWith(MOCK_USER_ID, {}, mockAudioFile, coverFile);
    });

    it('should return service response', async () => {
      const expected = {
        status: 'success',
        message: 'Track upload started.',
        data: { trackId: MOCK_TRACK_ID },
      };
      service.uploadTrack.mockResolvedValue(expected);

      const result = await controller.uploadTrack(MOCK_USER_ID, {} as UploadTrackDto, {
        audio: [mockAudioFile],
      });

      expect(result).toBe(expected);
    });
  });

  // ─── updateTrackMetadata ──────────────────────────────────────────────────────

  describe('updateTrackMetadata', () => {
    it('should delegate to service with trackId, userId, dto and optional cover', async () => {
      const dto = { title: 'Updated' };
      service.updateTrackMetadata.mockResolvedValue({ status: 'success', data: {} });

      await controller.updateTrackMetadata(
        MOCK_TRACK_ID,
        MOCK_USER_ID,
        dto as UpdateTrackDto,
        undefined
      );

      expect(service.updateTrackMetadata).toHaveBeenCalledWith(
        MOCK_TRACK_ID,
        MOCK_USER_ID,
        dto,
        undefined
      );
    });

    it('should return service response as-is', async () => {
      const expected = { status: 'success', data: { title: 'Updated' } };
      service.updateTrackMetadata.mockResolvedValue(expected);

      const result = await controller.updateTrackMetadata(
        MOCK_TRACK_ID,
        MOCK_USER_ID,
        {} as UpdateTrackDto,
        undefined
      );

      expect(result).toBe(expected);
    });

    it('should propagate ForbiddenException', async () => {
      service.updateTrackMetadata.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.updateTrackMetadata(MOCK_TRACK_ID, MOCK_USER_ID, {} as UpdateTrackDto, undefined)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should propagate NotFoundException', async () => {
      service.updateTrackMetadata.mockRejectedValue(new NotFoundException());

      await expect(
        controller.updateTrackMetadata(MOCK_TRACK_ID, MOCK_USER_ID, {} as UpdateTrackDto, undefined)
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── reuploadTrackAudio ───────────────────────────────────────────────────────

  describe('reuploadTrackAudio', () => {
    const audioFile = {
      originalname: 'new.mp3',
      buffer: Buffer.from('audio'),
    } as Express.Multer.File;

    it('should delegate to service', async () => {
      service.reuploadTrackAudio.mockResolvedValue({
        status: 'success',
        data: { trackStatus: 'processing' },
      });

      await controller.reuploadTrackAudio(MOCK_TRACK_ID, MOCK_USER_ID, audioFile);

      expect(service.reuploadTrackAudio).toHaveBeenCalledWith(
        MOCK_TRACK_ID,
        MOCK_USER_ID,
        audioFile,
        undefined
      );
    });

    it('should throw BadRequestException when no audio file provided', async () => {
      await expect(
        controller.reuploadTrackAudio(MOCK_TRACK_ID, MOCK_USER_ID, undefined)
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate ConflictException', async () => {
      service.reuploadTrackAudio.mockRejectedValue(new ConflictException());

      await expect(
        controller.reuploadTrackAudio(MOCK_TRACK_ID, MOCK_USER_ID, audioFile)
      ).rejects.toThrow(ConflictException);
    });

    it('should return service response', async () => {
      const expected = {
        status: 'success',
        data: { trackId: MOCK_TRACK_ID, trackStatus: 'processing' },
      };
      service.reuploadTrackAudio.mockResolvedValue(expected);

      const result = await controller.reuploadTrackAudio(MOCK_TRACK_ID, MOCK_USER_ID, audioFile);

      expect(result).toBe(expected);
    });
  });

  // ─── streamTrackStatus (GET processing status) ────────────────────────────────

  describe('streamTrackStatus', () => {
    type StatusEvent = { data: { event: string; data: { trackId: string } } };

    it('should emit completed event immediately when track is already finished', async () => {
      const finishedTrack = mockPublicTrack({
        trackStatus: 'finished',
        audioUrl: 'https://s3/track.mp3',
        waveformUrl: 'https://s3/track.json',
        durationSeconds: 213,
      });
      service.getTrackById.mockResolvedValue(finishedTrack);

      const stream$ = controller.streamTrackStatus(MOCK_TRACK_ID);
      const event = await firstValueFrom(stream$);

      expect((event as StatusEvent).data.event).toBe('completed');
      expect((event as StatusEvent).data.data.trackId).toBe(MOCK_TRACK_ID);
    });

    it('should emit failed event immediately when track is in failed status', async () => {
      const failedTrack = mockPublicTrack({ trackStatus: 'failed' });
      service.getTrackById.mockResolvedValue(failedTrack);

      const stream$ = controller.streamTrackStatus(MOCK_TRACK_ID);
      const event = await firstValueFrom(stream$);

      expect((event as StatusEvent).data.event).toBe('failed');
    });

    it('should propagate NotFoundException when track not found', async () => {
      service.getTrackById.mockRejectedValue(new NotFoundException('Track not found'));

      const stream$ = controller.streamTrackStatus(MOCK_TRACK_ID);

      await expect(firstValueFrom(stream$)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── playTrack ────────────────────────────────────────────────────────────────

  describe('playTrack', () => {
    it('should delegate to service with trackId, userId and optional playlistId', async () => {
      service.playTrack.mockResolvedValue({
        status: 'success',
        message: 'Track play recorded',
        data: { trackId: MOCK_TRACK_ID, playCount: 1 },
      });

      await controller.playTrack(MOCK_TRACK_ID, MOCK_USER_ID, undefined);

      expect(service.playTrack).toHaveBeenCalledWith(MOCK_TRACK_ID, MOCK_USER_ID, undefined);
    });

    it('should return service response', async () => {
      const expected = {
        status: 'success',
        message: 'Track play recorded',
        data: { trackId: MOCK_TRACK_ID, playCount: 11 },
      };
      service.playTrack.mockResolvedValue(expected);

      const result = await controller.playTrack(MOCK_TRACK_ID, MOCK_USER_ID, undefined);

      expect(result).toBe(expected);
    });

    it('should propagate NotFoundException', async () => {
      service.playTrack.mockRejectedValue(new NotFoundException());

      await expect(controller.playTrack(MOCK_TRACK_ID, MOCK_USER_ID, undefined)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // ─── getTopFans ───────────────────────────────────────────────────────────────

  describe('getTopFans', () => {
    it('should delegate to service', async () => {
      service.getTopFans.mockResolvedValue({ status: 'success', data: [] });

      await controller.getTopFans(MOCK_TRACK_ID);

      expect(service.getTopFans).toHaveBeenCalledWith(MOCK_TRACK_ID);
    });

    it('should return service response as-is', async () => {
      const expected = { status: 'success', data: [{ rank: 1, playCount: 50, user: {} }] };
      service.getTopFans.mockResolvedValue(expected);

      const result = await controller.getTopFans(MOCK_TRACK_ID);

      expect(result).toBe(expected);
    });

    it('should propagate NotFoundException', async () => {
      service.getTopFans.mockRejectedValue(new NotFoundException());

      await expect(controller.getTopFans(MOCK_TRACK_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getFirstFans ─────────────────────────────────────────────────────────────

  describe('getFirstFans', () => {
    it('should delegate to service', async () => {
      service.getFirstFans.mockResolvedValue({ status: 'success', data: [] });

      await controller.getFirstFans(MOCK_TRACK_ID);

      expect(service.getFirstFans).toHaveBeenCalledWith(MOCK_TRACK_ID);
    });

    it('should return service response as-is', async () => {
      const expected = { status: 'success', data: [{ rank: 1, playCount: 30, user: {} }] };
      service.getFirstFans.mockResolvedValue(expected);

      const result = await controller.getFirstFans(MOCK_TRACK_ID);

      expect(result).toBe(expected);
    });

    it('should propagate NotFoundException', async () => {
      service.getFirstFans.mockRejectedValue(new NotFoundException());

      await expect(controller.getFirstFans(MOCK_TRACK_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── streamTrackStatus (processing path) ──────────────────────────────────

  describe('streamTrackStatus — processing path', () => {
    it('should delegate to TrackSseService.getStream when track is still processing', async () => {
      const processingTrack = mockPublicTrack({ trackStatus: 'processing' });
      service.getTrackById.mockResolvedValue(processingTrack);

      const sentinel = { data: { event: 'processing' } };
      sseService.getStream.mockReturnValue(of(sentinel));

      const stream$ = controller.streamTrackStatus(MOCK_TRACK_ID);
      const event = await firstValueFrom(stream$);

      expect(sseService.getStream).toHaveBeenCalledWith(MOCK_TRACK_ID);
      expect(event).toBe(sentinel);
    });
  });

  // ─── getUserQuota ──────────────────────────────────────────────────────────

  describe('getUserTimeUser (getUserQuota)', () => {
    it('should delegate to service.getUserQuota with userId', async () => {
      const quota = { totalDurationMs: 3_600_000, usedDurationMs: 1_200_000 };
      service.getUserQuota.mockResolvedValue(quota);

      const result = await controller.getUserTimeUser(MOCK_USER_ID);

      expect(service.getUserQuota).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(result).toBe(quota);
    });
  });

  // ─── deleteTrack ──────────────────────────────────────────────────────────────

  describe('deleteTrack', () => {
    it('should delegate to service with trackId and userId', async () => {
      service.deleteTrack.mockResolvedValue({
        status: 'success',
        message: 'Track deleted successfully',
      });

      await controller.deleteTrack(MOCK_TRACK_ID, MOCK_USER_ID);

      expect(service.deleteTrack).toHaveBeenCalledWith(MOCK_TRACK_ID, MOCK_USER_ID);
    });

    it('should return service response as-is', async () => {
      const expected = { status: 'success', message: 'Track deleted successfully' };
      service.deleteTrack.mockResolvedValue(expected);

      const result = await controller.deleteTrack(MOCK_TRACK_ID, MOCK_USER_ID);

      expect(result).toBe(expected);
    });

    it('should propagate NotFoundException when track does not exist', async () => {
      service.deleteTrack.mockRejectedValue(new NotFoundException());

      await expect(controller.deleteTrack(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should propagate ForbiddenException when user does not own the track', async () => {
      service.deleteTrack.mockRejectedValue(new ForbiddenException());

      await expect(controller.deleteTrack(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ─── getRelatedTracks ─────────────────────────────────────────────────────────

  describe('getRelatedTracks', () => {
    const ARTIST = 'dj_nour';
    const TITLE = 'Midnight Drive';

    it('should delegate to service with correct args', async () => {
      service.getRelatedTracks.mockResolvedValue({ status: 'success', data: [] });

      await controller.getRelatedTracks(ARTIST, TITLE, 1, 10, '1.2.3.4', undefined);

      expect(service.getRelatedTracks).toHaveBeenCalledWith(
        TITLE,
        ARTIST,
        1,
        10,
        '1.2.3.4',
        undefined
      );
    });

    it('should return service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        data: [mockPublicTrack()],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 1, limit: 10 },
      };
      service.getRelatedTracks.mockResolvedValue(mockResponse);

      const result = await controller.getRelatedTracks(ARTIST, TITLE, 1, 10, '1.2.3.4', undefined);

      expect(result).toBe(mockResponse);
    });

    it('should propagate NotFoundException when track does not exist', async () => {
      service.getRelatedTracks.mockRejectedValue(new NotFoundException());

      await expect(
        controller.getRelatedTracks(ARTIST, TITLE, 1, 10, '1.2.3.4', undefined)
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when track is private', async () => {
      service.getRelatedTracks.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.getRelatedTracks(ARTIST, TITLE, 1, 10, '1.2.3.4', undefined)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getAllTimeStats ──────────────────────────────────────────────────────────

  describe('getAllTimeStats', () => {
    it('should delegate to service with the current user id', async () => {
      service.getAllTimeStats.mockResolvedValue({ status: 'success', data: {} });

      await controller.getAllTimeStats(MOCK_USER_ID);

      expect(service.getAllTimeStats).toHaveBeenCalledWith(MOCK_USER_ID);
    });

    it('should return service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        data: {
          totalPlays: 152300,
          totalLikes: 8750,
          totalReposts: 2100,
          totalComments: 640,
          totalDownloads: 0,
        },
      };
      service.getAllTimeStats.mockResolvedValue(mockResponse);

      const result = await controller.getAllTimeStats(MOCK_USER_ID);

      expect(result).toBe(mockResponse);
    });
  });

  // ─── getTopListeners ─────────────────────────────────────────────────────────

  describe('getTopListeners', () => {
    it('should delegate to service with the current userId', async () => {
      service.getTopListeners.mockResolvedValue({ status: 'success', data: [] });

      await controller.getTopListeners(MOCK_USER_ID);

      expect(service.getTopListeners).toHaveBeenCalledWith(MOCK_USER_ID);
    });

    it('should return service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        data: [
          {
            userId: MOCK_MY_USER_ID,
            username: 'superfan1',
            displayName: 'Super Fan',
            avatarUrl: 'https://example.com/avatar.jpg',
            followersCount: 200,
            playCount: 42,
          },
        ],
      };
      service.getTopListeners.mockResolvedValue(mockResponse);

      const result = await controller.getTopListeners(MOCK_USER_ID);

      expect(result).toBe(mockResponse);
    });
  });

  // ─── getTopRegions ────────────────────────────────────────────────────────────

  describe('getTopRegions', () => {
    it('should delegate to service with the current userId', async () => {
      service.getTopRegions.mockResolvedValue({ status: 'success', data: [] });

      await controller.getTopRegions(MOCK_USER_ID);

      expect(service.getTopRegions).toHaveBeenCalledWith(MOCK_USER_ID);
    });

    it('should return service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        data: [
          { country: 'EG', playCount: 120 },
          { country: 'US', playCount: 85 },
        ],
      };
      service.getTopRegions.mockResolvedValue(mockResponse);

      const result = await controller.getTopRegions(MOCK_USER_ID);

      expect(result).toBe(mockResponse);
    });
  });

  // ─── getTopPlaylistsAndAlbums ─────────────────────────────────────────────────

  describe('getTopPlaylistsAndAlbums', () => {
    it('should delegate to service with the current userId', async () => {
      service.getTopPlaylistsAndAlbums.mockResolvedValue({ status: 'success', data: [] });

      await controller.getTopPlaylistsAndAlbums(MOCK_USER_ID);

      expect(service.getTopPlaylistsAndAlbums).toHaveBeenCalledWith(MOCK_USER_ID);
    });

    it('should return service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        data: [
          {
            playlistId: '770e8400-e29b-41d4-a716-446655440020',
            title: 'Late Night Vibes',
            coverImage: 'https://s3.amazonaws.com/covers/playlist.jpg',
            trackCount: 14,
            likesCount: 200,
            repostsCount: 30,
            ownerId: MOCK_MY_USER_ID,
            type: 'playlist',
            playCount: 560,
          },
        ],
      };
      service.getTopPlaylistsAndAlbums.mockResolvedValue(mockResponse);

      const result = await controller.getTopPlaylistsAndAlbums(MOCK_USER_ID);

      expect(result).toBe(mockResponse);
    });
  });

  // ─── getsSpotlightTracks ──────────────────────────────────────────────────────

  describe('getsSpotlightTracks', () => {
    it('should delegate to service with userId and ip', async () => {
      service.getUserSpotlightTacks.mockResolvedValue([]);
      await controller.getsSpotlightTracks(MOCK_USER_ID, '1.2.3.4');
      expect(service.getUserSpotlightTacks).toHaveBeenCalledWith(MOCK_USER_ID, '1.2.3.4');
    });

    it('should return service response as-is', async () => {
      const mockTracks = [{ trackId: MOCK_TRACK_ID, title: 'My Song' }];
      service.getUserSpotlightTacks.mockResolvedValue(mockTracks);
      expect(await controller.getsSpotlightTracks(MOCK_USER_ID, '1.2.3.4')).toBe(mockTracks);
    });

    it('should propagate BadRequestException when user not found', async () => {
      service.getUserSpotlightTacks.mockRejectedValue(new BadRequestException('user is not found'));
      await expect(controller.getsSpotlightTracks(MOCK_USER_ID, '1.2.3.4')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ─── addToSpotlight ───────────────────────────────────────────────────────────

  describe('addToSpotlight', () => {
    it('should delegate to service with userId and trackId', async () => {
      service.addToSpotlight.mockResolvedValue({ status: 'success' });
      await controller.addToSpotlight(MOCK_USER_ID, MOCK_TRACK_ID);
      expect(service.addToSpotlight).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_TRACK_ID);
    });

    it('should return service response as-is', async () => {
      const mockResponse = {
        status: 'success',
        messsage: 'track is successfully added to spotlight',
      };
      service.addToSpotlight.mockResolvedValue(mockResponse);
      expect(await controller.addToSpotlight(MOCK_USER_ID, MOCK_TRACK_ID)).toBe(mockResponse);
    });

    it('should propagate BadRequestException when track not found', async () => {
      service.addToSpotlight.mockRejectedValue(new BadRequestException('track not found'));
      await expect(controller.addToSpotlight(MOCK_USER_ID, MOCK_TRACK_ID)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should propagate ForbiddenException when spotlight limit reached', async () => {
      service.addToSpotlight.mockRejectedValue(new ForbiddenException());
      await expect(controller.addToSpotlight(MOCK_USER_ID, MOCK_TRACK_ID)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ─── updateSpotlightTracks ────────────────────────────────────────────────────

  describe('updateSpotlightTracks', () => {
    const body = { trackIds: [MOCK_TRACK_ID] };

    it('should delegate to service with userId and trackIds', async () => {
      service.updateSpotlightTracks.mockResolvedValue(undefined);
      await controller.updateSpotlightTracks(MOCK_USER_ID, body);
      expect(service.updateSpotlightTracks).toHaveBeenCalledWith(MOCK_USER_ID, body.trackIds);
    });

    it('should propagate BadRequestException when too many trackIds', async () => {
      service.updateSpotlightTracks.mockRejectedValue(
        new BadRequestException('Maximum 5 tracks allowed in spotlight')
      );
      await expect(controller.updateSpotlightTracks(MOCK_USER_ID, body)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ─── fileFilter logic — uploadTrack ──────────────────────────────────────────
  // Tests replicate the inline fileFilter closure inside FileFieldsInterceptor on uploadTrack

  describe('uploadTrack fileFilter logic', () => {
    const ALLOWED_AUDIO = [
      'audio/mpeg',
      'audio/wav',
      'audio/x-wav',
      'audio/wave',
      'audio/vnd.wave',
      'audio/flac',
      'audio/x-flac',
      'audio/aiff',
      'audio/x-aiff',
    ];
    const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp'];
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

    function fileFilter(
      _: unknown,
      file: { fieldname: string; mimetype: string; size: number },
      cb: jest.Mock
    ) {
      if (file.fieldname === 'audio') {
        if (ALLOWED_AUDIO.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid audio type. Allowed: MP3, WAV, FLAC, AIFF'), false);
        }
      } else if (file.fieldname === 'cover') {
        if (file.size > MAX_IMAGE_SIZE)
          cb(new BadRequestException('Cover image must be under 10 MB'), false);
        else if (ALLOWED_IMAGE.includes(file.mimetype)) cb(null, true);
        else cb(new BadRequestException('Invalid cover type. Allowed: JPEG, PNG, WebP'), false);
      } else {
        cb(null, false);
      }
    }

    let cb: jest.Mock;
    beforeEach(() => {
      cb = jest.fn();
    });

    it('should accept valid audio file (audio/mpeg)', () => {
      fileFilter(null, { fieldname: 'audio', mimetype: 'audio/mpeg', size: 100 }, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should reject invalid audio type', () => {
      fileFilter(null, { fieldname: 'audio', mimetype: 'video/mp4', size: 100 }, cb);
      expect(cb).toHaveBeenCalledWith(expect.any(BadRequestException), false);
    });

    it('should accept valid cover image (image/jpeg)', () => {
      fileFilter(null, { fieldname: 'cover', mimetype: 'image/jpeg', size: 100 }, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should reject cover image exceeding MAX_IMAGE_SIZE', () => {
      fileFilter(null, { fieldname: 'cover', mimetype: 'image/jpeg', size: 11 * 1024 * 1024 }, cb);
      expect(cb).toHaveBeenCalledWith(expect.any(BadRequestException), false);
    });

    it('should reject invalid cover type', () => {
      fileFilter(null, { fieldname: 'cover', mimetype: 'image/gif', size: 100 }, cb);
      expect(cb).toHaveBeenCalledWith(expect.any(BadRequestException), false);
    });

    it('should silently skip unknown fieldname', () => {
      fileFilter(
        null,
        { fieldname: 'unknown', mimetype: 'application/octet-stream', size: 100 },
        cb
      );
      expect(cb).toHaveBeenCalledWith(null, false);
    });
  });

  // ─── fileFilter logic — updateTrackMetadata ───────────────────────────────────

  describe('updateTrackMetadata cover fileFilter logic', () => {
    const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp'];

    function fileFilter(_: unknown, file: { mimetype: string }, cb: jest.Mock) {
      if (ALLOWED_IMAGE.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Invalid cover type. Allowed: JPEG, PNG, WebP'), false);
      }
    }

    let cb: jest.Mock;
    beforeEach(() => {
      cb = jest.fn();
    });

    it('should accept valid image type', () => {
      fileFilter(null, { mimetype: 'image/png' }, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should reject invalid image type', () => {
      fileFilter(null, { mimetype: 'image/bmp' }, cb);
      expect(cb).toHaveBeenCalledWith(expect.any(BadRequestException), false);
    });
  });

  // ─── fileFilter logic — reuploadTrackAudio ────────────────────────────────────

  describe('reuploadTrackAudio audio fileFilter logic', () => {
    const ALLOWED_AUDIO = [
      'audio/mpeg',
      'audio/wav',
      'audio/x-wav',
      'audio/wave',
      'audio/vnd.wave',
      'audio/flac',
      'audio/x-flac',
      'audio/aiff',
      'audio/x-aiff',
    ];

    function fileFilter(_: unknown, file: { mimetype: string }, cb: jest.Mock) {
      if (ALLOWED_AUDIO.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Invalid audio type. Allowed: MP3, WAV, FLAC, AIFF'), false);
      }
    }

    let cb: jest.Mock;
    beforeEach(() => {
      cb = jest.fn();
    });

    it('should accept valid audio type', () => {
      fileFilter(null, { mimetype: 'audio/mpeg' }, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should reject invalid audio type', () => {
      fileFilter(null, { mimetype: 'audio/ogg' }, cb);
      expect(cb).toHaveBeenCalledWith(expect.any(BadRequestException), false);
    });
  });

  // ─── updateCommentSettings ────────────────────────────────────────────────────

  describe('updateCommentSettings', () => {
    it('should delegate to service with correct args', async () => {
      service.updateTrackCommentSettings.mockResolvedValue({
        status: 'success',
        message: 'track comment settings  updated',
      });

      await controller.updateCommentSettings(MOCK_USER_ID, MOCK_TRACK_ID, true, false);

      expect(service.updateTrackCommentSettings).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_TRACK_ID,
        true,
        false
      );
    });

    it('should return service response as-is', async () => {
      const expected = { status: 'success', message: 'track comment settings  updated' };
      service.updateTrackCommentSettings.mockResolvedValue(expected);

      const result = await controller.updateCommentSettings(
        MOCK_USER_ID,
        MOCK_TRACK_ID,
        true,
        true
      );

      expect(result).toBe(expected);
    });

    it('should propagate BadRequestException when track not found', async () => {
      service.updateTrackCommentSettings.mockRejectedValue(
        new BadRequestException('track is not found')
      );

      await expect(
        controller.updateCommentSettings(MOCK_USER_ID, MOCK_TRACK_ID, true, true)
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate BadRequestException when user is not owner', async () => {
      service.updateTrackCommentSettings.mockRejectedValue(
        new BadRequestException('you are not the owner of this track')
      );

      await expect(
        controller.updateCommentSettings(MOCK_USER_ID, MOCK_TRACK_ID, true, true)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── scheduleRelease ──────────────────────────────────────────────────────────

  describe('scheduleRelease', () => {
    const dto = { scheduledAt: new Date(Date.now() + 86400000).toISOString() };

    it('should delegate to service with userId, trackId, and parsed Date', async () => {
      service.scheduleRelease.mockResolvedValue({
        status: 'success',
        message: 'Track scheduled for release.',
        data: { trackId: MOCK_TRACK_ID, scheduledAt: dto.scheduledAt },
      });

      await controller.scheduleRelease(MOCK_USER_ID, MOCK_TRACK_ID, dto as ScheduleReleaseDto);

      expect(service.scheduleRelease).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_TRACK_ID,
        expect.any(Date)
      );
    });

    it('should return service response as-is', async () => {
      const expected = {
        status: 'success',
        message: 'Track scheduled for release.',
        data: { trackId: MOCK_TRACK_ID },
      };
      service.scheduleRelease.mockResolvedValue(expected);

      const result = await controller.scheduleRelease(
        MOCK_USER_ID,
        MOCK_TRACK_ID,
        dto as ScheduleReleaseDto
      );

      expect(result).toBe(expected);
    });

    it('should propagate NotFoundException when track not found', async () => {
      service.scheduleRelease.mockRejectedValue(new NotFoundException('Track not found'));

      await expect(
        controller.scheduleRelease(MOCK_USER_ID, MOCK_TRACK_ID, dto as ScheduleReleaseDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when user does not own the track', async () => {
      service.scheduleRelease.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.scheduleRelease(MOCK_USER_ID, MOCK_TRACK_ID, dto as ScheduleReleaseDto)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should propagate BadRequestException for past date', async () => {
      service.scheduleRelease.mockRejectedValue(
        new BadRequestException('Scheduled date must be in the future')
      );

      await expect(
        controller.scheduleRelease(MOCK_USER_ID, MOCK_TRACK_ID, dto as ScheduleReleaseDto)
      ).rejects.toThrow(BadRequestException);
    });
  });
});
