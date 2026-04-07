import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { TrackService } from './track.service';
import { TrackRepository } from './track.repository';
import { UserRepository } from '../user/user.repository';
import { GenreRepository } from '../genre/genre.repository';
import { TrackSseService } from './services/track-sse.service';
import { StorageService } from '../common/storage_service';
import { PlaylistRepository } from '../playlist/playlist.repository';
import { TrackVisibility } from './enums/track-visibility.enum';
import { TrackStatus } from './enums/track-status.enum';
import * as geolocationUtil from '../common/utilities/geolocation.util';
import {
  MOCK_TRACK_ID,
  MOCK_USER_ID,
  MOCK_OTHER_USER_ID,
  MOCK_MY_USER_ID,
  MOCK_COMMENT_ID,
  MOCK_PARENT_COMMENT_ID,
  mockPublicTrack,
  mockPrivateTrack,
  mockOwnTrack,
  mockProcessingTrack,
  mockTrackWithRelations,
  mockPublicUser,
  mockPrivateUser,
  mockGoUser,
  mockTrackRepost,
  mockRepostWithUser,
  mockRepostWithTrack,
  mockTrackLike,
  mockLikeWithUser,
  mockLikeWithTrack,
  mockTrackComment,
  mockParentComment,
  mockPlaylistEntry,
  mockGenre,
  mockJwtPayload,
  mockProJwtPayload,
  mockGoJwtPayload,
  mockTrackRepository,
  mockUserRepository,
  mockGenreRepository,
  mockPlaylistRepository,
  mockStorageService,
  mockAudioQueue,
} from './tests/track.mock';

const MOCK_CAPTION = 'Great track!';

describe('TrackService', () => {
  let service: TrackService;
  let trackRepo: ReturnType<typeof mockTrackRepository>;
  let userRepo: ReturnType<typeof mockUserRepository>;
  let genreRepo: ReturnType<typeof mockGenreRepository>;
  let playlistRepo: ReturnType<typeof mockPlaylistRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackService,
        { provide: TrackRepository, useFactory: mockTrackRepository },
        { provide: UserRepository, useFactory: mockUserRepository },
        { provide: GenreRepository, useFactory: mockGenreRepository },
        { provide: PlaylistRepository, useFactory: mockPlaylistRepository },
        { provide: TrackSseService, useValue: {} },
        { provide: StorageService, useFactory: mockStorageService },
        { provide: getQueueToken('audioQueue'), useFactory: mockAudioQueue },
      ],
    }).compile();

    service = module.get<TrackService>(TrackService);
    trackRepo = module.get(TrackRepository);
    userRepo = module.get(UserRepository);
    genreRepo = module.get(GenreRepository);
    playlistRepo = module.get(PlaylistRepository);

    (service as any).playlistRepository = playlistRepo;
  });

  afterEach(() => jest.clearAllMocks());

  // ─── repostTrack ──────────────────────────────────────────────────────────────

  describe('repostTrack', () => {
    it('should call repostTrack on repo with correct args and return the created repost', async () => {
      const repost = mockTrackRepost();
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.didUserRepostTrack.mockResolvedValue(false);
      trackRepo.repostTrack.mockResolvedValue(repost);

      const result = await service.repostTrack(MOCK_TRACK_ID, MOCK_USER_ID, MOCK_CAPTION);

      expect(trackRepo.repostTrack).toHaveBeenCalledWith(MOCK_TRACK_ID, MOCK_USER_ID, MOCK_CAPTION);
      expect(result).toEqual({ status: 'success', data: repost });
    });

    it('should work without caption', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.didUserRepostTrack.mockResolvedValue(false);
      trackRepo.repostTrack.mockResolvedValue(mockTrackRepost());

      await service.repostTrack(MOCK_TRACK_ID, MOCK_USER_ID);

      expect(trackRepo.repostTrack).toHaveBeenCalledWith(MOCK_TRACK_ID, MOCK_USER_ID, undefined);
    });

    it('should throw NotFoundException when track not found', async () => {
      trackRepo.findById.mockResolvedValue(null);

      await expect(service.repostTrack(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException when user tries to repost own track', async () => {
      trackRepo.findById.mockResolvedValue(mockOwnTrack());

      await expect(service.repostTrack(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw ForbiddenException when track is private', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(service.repostTrack(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should NOT call didUserRepostTrack if track is private', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(service.repostTrack(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow();
      expect(trackRepo.didUserRepostTrack).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when already reposted', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.didUserRepostTrack.mockResolvedValue(true);

      await expect(service.repostTrack(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow(
        ConflictException
      );
    });
  });

  // ─── getTrackRepostsCount ─────────────────────────────────────────────────────

  describe('getTrackRepostsCount', () => {
    it('should return repostsCount for a public track', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackRepostsCount.mockResolvedValue(5);

      const result = await service.getTrackRepostsCount(MOCK_TRACK_ID, MOCK_USER_ID);

      expect(result).toEqual({
        status: 'success',
        data: { trackId: MOCK_TRACK_ID, repostsCount: 5 },
      });
    });

    it('should allow owner to access private track', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack({ userId: MOCK_USER_ID }));
      trackRepo.getTrackRepostsCount.mockResolvedValue(3);

      const result = await service.getTrackRepostsCount(MOCK_TRACK_ID, MOCK_USER_ID);

      expect(result.data).toMatchObject({ repostsCount: 3 });
    });

    it('should throw NotFoundException when track not found', async () => {
      trackRepo.findById.mockResolvedValue(null);

      await expect(service.getTrackRepostsCount(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when track is private and user is not owner', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(service.getTrackRepostsCount(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ─── removeTrackRepost ────────────────────────────────────────────────────────

  describe('removeTrackRepost', () => {
    it('should remove repost and return success', async () => {
      trackRepo.didUserRepostTrack.mockResolvedValue(true);
      trackRepo.removeTrackRepost.mockResolvedValue(undefined);

      const result = await service.removeTrackRepost(MOCK_TRACK_ID, MOCK_USER_ID);

      expect(result).toEqual({ status: 'success', message: 'Repost successfully removed' });
    });

    it('should throw BadRequestException when user has not reposted', async () => {
      trackRepo.didUserRepostTrack.mockResolvedValue(false);

      await expect(service.removeTrackRepost(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should NOT call removeTrackRepost if user has not reposted', async () => {
      trackRepo.didUserRepostTrack.mockResolvedValue(false);

      await expect(service.removeTrackRepost(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow();
      expect(trackRepo.removeTrackRepost).not.toHaveBeenCalled();
    });
  });

  // ─── editTrackRepost ──────────────────────────────────────────────────────────

  describe('editTrackRepost', () => {
    it('should return updated repost', async () => {
      const updated = mockTrackRepost({ caption: 'Updated!' });
      trackRepo.editTrackRepost.mockResolvedValue(updated);

      const result = await service.editTrackRepost(MOCK_TRACK_ID, MOCK_USER_ID, 'Updated!');

      expect(result).toEqual({ status: 'success', data: updated });
    });

    it('should throw BadRequestException when repost not found', async () => {
      trackRepo.editTrackRepost.mockResolvedValue(null);

      await expect(service.editTrackRepost(MOCK_TRACK_ID, MOCK_USER_ID, 'test')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ─── getTrackReposts ──────────────────────────────────────────────────────────

  describe('getTrackReposts', () => {
    it('should return paginated reposters for a public track', async () => {
      const repost = mockRepostWithUser();
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackReposts.mockResolvedValue([[repost], 1]);

      const result = await service.getTrackReposts(MOCK_TRACK_ID, MOCK_USER_ID, 1, 20);

      expect(result.status).toBe('success');
      expect(result.data[0]).toMatchObject({ userId: MOCK_OTHER_USER_ID, username: 'other_user' });
      expect(result.pagination).toMatchObject({ currentPage: 1, totalCount: 1 });
    });

    it('should throw ForbiddenException when track is private and user is not owner', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(service.getTrackReposts(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should cap limit at 100', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackReposts.mockResolvedValue([[], 0]);

      await service.getTrackReposts(MOCK_TRACK_ID, MOCK_USER_ID, 1, 200);

      expect(trackRepo.getTrackReposts).toHaveBeenCalledWith(MOCK_TRACK_ID, 1, 100);
    });
  });

  // ─── getUserTrackReposts ──────────────────────────────────────────────────────

  describe('getUserTrackReposts', () => {
    it('should return paginated reposts for a public user', async () => {
      const repost = mockRepostWithTrack();
      userRepo.findById.mockResolvedValue(mockPublicUser());
      trackRepo.getUserTrackReposts.mockResolvedValue([[repost], 1]);

      const result = await service.getUserTrackReposts(MOCK_OTHER_USER_ID, MOCK_MY_USER_ID, 1, 20);

      expect(result.status).toBe('success');
      expect(trackRepo.getUserTrackReposts).toHaveBeenCalledWith(MOCK_OTHER_USER_ID, 1, 20);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(
        service.getUserTrackReposts(MOCK_OTHER_USER_ID, MOCK_MY_USER_ID)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when account is private and requester is not owner', async () => {
      userRepo.findById.mockResolvedValue(mockPrivateUser());

      await expect(
        service.getUserTrackReposts(MOCK_OTHER_USER_ID, MOCK_MY_USER_ID)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow private user to view their own reposts', async () => {
      userRepo.findById.mockResolvedValue(mockPrivateUser());
      trackRepo.getUserTrackReposts.mockResolvedValue([[mockRepostWithTrack()], 1]);

      await expect(
        service.getUserTrackReposts(MOCK_OTHER_USER_ID, MOCK_OTHER_USER_ID)
      ).resolves.not.toThrow();
    });
  });

  // ─── likeTrack ────────────────────────────────────────────────────────────────

  describe('likeTrack', () => {
    it('should return created like on success', async () => {
      const like = mockTrackLike();
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.didUserLikeTrack.mockResolvedValue(false);
      trackRepo.likeTrack.mockResolvedValue(like);

      const result = await service.likeTrack(MOCK_TRACK_ID, MOCK_USER_ID);

      expect(result).toEqual({ status: 'success', data: like });
    });

    it('should throw BadRequestException when liking own track', async () => {
      trackRepo.findById.mockResolvedValue(mockOwnTrack());

      await expect(service.likeTrack(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw ForbiddenException when track is private', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(service.likeTrack(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw ConflictException when already liked', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.didUserLikeTrack.mockResolvedValue(true);

      await expect(service.likeTrack(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow(
        ConflictException
      );
    });
  });

  // ─── getTrackLikesCount ───────────────────────────────────────────────────────

  describe('getTrackLikesCount', () => {
    it('should return likesCount', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackLikesCount.mockResolvedValue(7);

      const result = await service.getTrackLikesCount(MOCK_TRACK_ID, MOCK_USER_ID);

      expect(result).toEqual({
        status: 'success',
        data: { trackId: MOCK_TRACK_ID, likesCount: 7 },
      });
    });

    it('should throw ForbiddenException when track is private and user is not owner', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(service.getTrackLikesCount(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ─── removeTrackLike ──────────────────────────────────────────────────────────

  describe('removeTrackLike', () => {
    it('should remove like and return success', async () => {
      trackRepo.didUserLikeTrack.mockResolvedValue(true);
      trackRepo.removeTrackLike.mockResolvedValue(undefined);

      const result = await service.removeTrackLike(MOCK_TRACK_ID, MOCK_USER_ID);

      expect(result).toEqual({ status: 'success', message: 'Track successfully unliked' });
    });

    it('should throw BadRequestException when user has not liked', async () => {
      trackRepo.didUserLikeTrack.mockResolvedValue(false);

      await expect(service.removeTrackLike(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ─── getTrackLikes ────────────────────────────────────────────────────────────

  describe('getTrackLikes', () => {
    it('should return paginated likers', async () => {
      const like = mockLikeWithUser();
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackLikes.mockResolvedValue([[like], 1]);

      const result = await service.getTrackLikes(MOCK_TRACK_ID, MOCK_USER_ID, 1, 20);

      expect(result.status).toBe('success');
      expect(result.data[0]).toMatchObject({ userId: MOCK_OTHER_USER_ID });
    });

    it('should throw ForbiddenException for private track', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(service.getTrackLikes(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should cap limit at 100', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackLikes.mockResolvedValue([[], 0]);

      await service.getTrackLikes(MOCK_TRACK_ID, MOCK_USER_ID, 1, 200);

      expect(trackRepo.getTrackLikes).toHaveBeenCalledWith(MOCK_TRACK_ID, 1, 100);
    });
  });

  // ─── getUserTrackLikes ────────────────────────────────────────────────────────

  describe('getUserTrackLikes', () => {
    it('should return paginated liked tracks for a public user', async () => {
      const like = mockLikeWithTrack();
      userRepo.findById.mockResolvedValue(mockPublicUser());
      trackRepo.getUserTrackLikes.mockResolvedValue([[like], 1]);

      const result = await service.getUserTrackLikes(MOCK_OTHER_USER_ID, MOCK_MY_USER_ID, 1, 20);

      expect(result.status).toBe('success');
    });

    it('should throw ForbiddenException for private account', async () => {
      userRepo.findById.mockResolvedValue(mockPrivateUser());

      await expect(service.getUserTrackLikes(MOCK_OTHER_USER_ID, MOCK_MY_USER_ID)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ─── addComment ───────────────────────────────────────────────────────────────

  describe('addComment', () => {
    const mockDto = { content: 'Great!', timestampSeconds: 56 };
    const mockDtoWithParent = {
      content: 'Reply!',
      timestampSeconds: 30,
      parentId: MOCK_PARENT_COMMENT_ID,
    };

    it('should create and return comment', async () => {
      const comment = mockTrackComment();
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.addComment.mockResolvedValue(comment);

      const result = await service.addComment(MOCK_TRACK_ID, MOCK_USER_ID, mockDto);

      expect(result).toEqual({ status: 'success', data: comment });
    });

    it('should throw ForbiddenException when track is private', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(service.addComment(MOCK_TRACK_ID, MOCK_USER_ID, mockDto)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw NotFoundException when parentId not found', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.findCommentById.mockResolvedValue(null);

      await expect(
        service.addComment(MOCK_TRACK_ID, MOCK_USER_ID, mockDtoWithParent)
      ).rejects.toThrow(NotFoundException);
    });

    it('should NOT call addComment if parent not found', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.findCommentById.mockResolvedValue(null);

      await expect(
        service.addComment(MOCK_TRACK_ID, MOCK_USER_ID, mockDtoWithParent)
      ).rejects.toThrow();
      expect(trackRepo.addComment).not.toHaveBeenCalled();
    });

    it('should call findCommentById when parentId provided', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.findCommentById.mockResolvedValue(mockParentComment());
      trackRepo.addComment.mockResolvedValue(
        mockTrackComment({ parentId: MOCK_PARENT_COMMENT_ID })
      );

      await service.addComment(MOCK_TRACK_ID, MOCK_USER_ID, mockDtoWithParent);

      expect(trackRepo.findCommentById).toHaveBeenCalledWith(MOCK_PARENT_COMMENT_ID);
    });

    it('should NOT call findCommentById when no parentId', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.addComment.mockResolvedValue(mockTrackComment());

      await service.addComment(MOCK_TRACK_ID, MOCK_USER_ID, mockDto);

      expect(trackRepo.findCommentById).not.toHaveBeenCalled();
    });
  });

  // ─── deleteComment ────────────────────────────────────────────────────────────

  describe('deleteComment', () => {
    it('should delete comment and return success', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.findCommentById.mockResolvedValue(
        mockTrackComment({ userId: MOCK_USER_ID, trackId: MOCK_TRACK_ID })
      );
      trackRepo.deleteComment.mockResolvedValue(undefined);

      const result = await service.deleteComment(MOCK_TRACK_ID, MOCK_COMMENT_ID, MOCK_USER_ID);

      expect(result).toEqual({ status: 'success', message: 'comment deleted successfully' });
    });

    it('should throw ForbiddenException when track is private', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(
        service.deleteComment(MOCK_TRACK_ID, MOCK_COMMENT_ID, MOCK_USER_ID)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when comment not found', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.findCommentById.mockResolvedValue(null);

      await expect(
        service.deleteComment(MOCK_TRACK_ID, MOCK_COMMENT_ID, MOCK_USER_ID)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when comment does not belong to track', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.findCommentById.mockResolvedValue(mockTrackComment({ trackId: 'wrong-track-id' }));

      await expect(
        service.deleteComment(MOCK_TRACK_ID, MOCK_COMMENT_ID, MOCK_USER_ID)
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException when user is not comment author', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.findCommentById.mockResolvedValue(
        mockTrackComment({ userId: MOCK_OTHER_USER_ID, trackId: MOCK_TRACK_ID })
      );

      await expect(
        service.deleteComment(MOCK_TRACK_ID, MOCK_COMMENT_ID, MOCK_USER_ID)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getTrackComments ─────────────────────────────────────────────────────────

  describe('getTrackComments', () => {
    it('should return paginated comments', async () => {
      const comment = mockTrackComment();
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackComments.mockResolvedValue([[comment], 1]);

      const result = await service.getTrackComments(
        MOCK_TRACK_ID,
        MOCK_USER_ID,
        1,
        20,
        'timestamp'
      );

      expect(result.status).toBe('success');
      expect(result.data).toHaveLength(1);
    });

    it('should throw ForbiddenException for private track', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(
        service.getTrackComments(MOCK_TRACK_ID, MOCK_USER_ID, 1, 20, 'timestamp')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow owner to get comments on private track', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack({ userId: MOCK_USER_ID }));
      trackRepo.getTrackComments.mockResolvedValue([[], 0]);

      await expect(service.getTrackComments(MOCK_TRACK_ID, MOCK_USER_ID)).resolves.not.toThrow();
    });

    it('should pass order=newest to repo', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackComments.mockResolvedValue([[], 0]);

      await service.getTrackComments(MOCK_TRACK_ID, MOCK_USER_ID, 1, 20, 'newest');

      expect(trackRepo.getTrackComments).toHaveBeenCalledWith(MOCK_TRACK_ID, 1, 20, 'newest');
    });

    it('should pass order=oldest to repo', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackComments.mockResolvedValue([[], 0]);

      await service.getTrackComments(MOCK_TRACK_ID, MOCK_USER_ID, 1, 20, 'oldest');

      expect(trackRepo.getTrackComments).toHaveBeenCalledWith(MOCK_TRACK_ID, 1, 20, 'oldest');
    });

    it('should cap limit at 100', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      trackRepo.getTrackComments.mockResolvedValue([[], 0]);

      await service.getTrackComments(MOCK_TRACK_ID, MOCK_USER_ID, 1, 200, 'timestamp');

      expect(trackRepo.getTrackComments).toHaveBeenCalledWith(MOCK_TRACK_ID, 1, 100, 'timestamp');
    });
  });

  // ─── getTrack ─────────────────────────────────────────────────────────────────

  describe('getTrack', () => {
    it('should return full track with genres, tags, and owner', async () => {
      trackRepo.findByIdWithRelations.mockResolvedValue(mockTrackWithRelations());

      const result = await service.getTrack(MOCK_TRACK_ID, mockJwtPayload());

      expect(result.status).toBe('success');
      expect(result.data).toMatchObject({
        trackId: MOCK_TRACK_ID,
        title: 'Midnight Drive',
      });
    });

    it('should throw NotFoundException when track not found', async () => {
      trackRepo.findByIdWithRelations.mockResolvedValue(null);

      await expect(service.getTrack(MOCK_TRACK_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when track is private and user is not owner', async () => {
      trackRepo.findByIdWithRelations.mockResolvedValue(
        mockTrackWithRelations({ visibility: TrackVisibility.PRIVATE })
      );

      await expect(service.getTrack(MOCK_TRACK_ID, mockJwtPayload())).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should allow owner to access private track', async () => {
      trackRepo.findByIdWithRelations.mockResolvedValue(
        mockTrackWithRelations({ visibility: TrackVisibility.PRIVATE, userId: MOCK_USER_ID })
      );

      await expect(service.getTrack(MOCK_TRACK_ID, mockJwtPayload())).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when user is in a blocked region', async () => {
      jest
        .spyOn(geolocationUtil, 'getLocationFromIp')
        .mockReturnValue({ country: 'EG', city: 'Cairo' });
      trackRepo.findByIdWithRelations.mockResolvedValue(
        mockTrackWithRelations({ blockedRegions: ['EG'], userId: MOCK_OTHER_USER_ID })
      );

      await expect(service.getTrack(MOCK_TRACK_ID, mockJwtPayload(), '1.2.3.4')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should NOT block when owner is in blocked region', async () => {
      jest
        .spyOn(geolocationUtil, 'getLocationFromIp')
        .mockReturnValue({ country: 'EG', city: 'Cairo' });
      trackRepo.findByIdWithRelations.mockResolvedValue(
        mockTrackWithRelations({ blockedRegions: ['EG'], userId: MOCK_USER_ID })
      );

      await expect(
        service.getTrack(MOCK_TRACK_ID, mockJwtPayload(), '1.2.3.4')
      ).resolves.not.toThrow();
    });

    it('should NOT block when country is not in blocked regions', async () => {
      jest
        .spyOn(geolocationUtil, 'getLocationFromIp')
        .mockReturnValue({ country: 'US', city: 'New York' });
      trackRepo.findByIdWithRelations.mockResolvedValue(
        mockTrackWithRelations({ blockedRegions: ['EG'] })
      );

      await expect(
        service.getTrack(MOCK_TRACK_ID, mockJwtPayload(), '1.2.3.4')
      ).resolves.not.toThrow();
    });

    it('should NOT block when blockedRegions is empty', async () => {
      jest
        .spyOn(geolocationUtil, 'getLocationFromIp')
        .mockReturnValue({ country: 'EG', city: 'Cairo' });
      trackRepo.findByIdWithRelations.mockResolvedValue(
        mockTrackWithRelations({ blockedRegions: [] })
      );

      await expect(
        service.getTrack(MOCK_TRACK_ID, mockJwtPayload(), '1.2.3.4')
      ).resolves.not.toThrow();
    });

    it('should NOT call getLocationFromIp when no ip provided', async () => {
      const spy = jest.spyOn(geolocationUtil, 'getLocationFromIp');
      trackRepo.findByIdWithRelations.mockResolvedValue(
        mockTrackWithRelations({ blockedRegions: ['EG'] })
      );

      await service.getTrack(MOCK_TRACK_ID, mockJwtPayload());

      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ─── getTrackAudio ────────────────────────────────────────────────────────────

  describe('getTrackAudio', () => {
    it('should return audioUrl, previewAudioUrl, and durationSeconds', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());

      const result = await service.getTrackAudio(MOCK_TRACK_ID, mockJwtPayload());

      expect(result.status).toBe('success');
      expect(result.data).toMatchObject({
        audioUrl: 'https://s3.amazonaws.com/audio/track.mp3',
        previewAudioUrl: 'https://s3.amazonaws.com/previews/track.mp3',
        durationSeconds: 213,
      });
    });

    it('should return HQ url for pro user', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());

      const result = await service.getTrackAudio(MOCK_TRACK_ID, mockProJwtPayload());

      expect(result.data.audioUrl).toBe('https://s3.amazonaws.com/audio/track_hq.mp3');
    });

    it('should return HQ url for go+ user', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());

      const result = await service.getTrackAudio(MOCK_TRACK_ID, mockGoJwtPayload());

      expect(result.data.audioUrl).toBe('https://s3.amazonaws.com/audio/track_hq.mp3');
    });

    it('should throw NotFoundException when track not found', async () => {
      trackRepo.findById.mockResolvedValue(null);

      await expect(service.getTrackAudio(MOCK_TRACK_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when track is private and user is not owner', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(service.getTrackAudio(MOCK_TRACK_ID, mockJwtPayload())).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw ConflictException when track is still processing', async () => {
      trackRepo.findById.mockResolvedValue(mockProcessingTrack());

      await expect(service.getTrackAudio(MOCK_TRACK_ID)).rejects.toThrow(ConflictException);
    });
  });

  // ─── updateBlockedRegions ─────────────────────────────────────────────────────

  describe('updateBlockedRegions', () => {
    it('should replace blocked regions and return updated list', async () => {
      trackRepo.findById.mockResolvedValue(mockOwnTrack());
      trackRepo.updateBlockedRegions.mockResolvedValue(
        mockOwnTrack({ blockedRegions: ['EG', 'US'] })
      );

      const result = await service.updateBlockedRegions(MOCK_TRACK_ID, MOCK_USER_ID, {
        blockedRegions: ['EG', 'US'],
      });

      expect(result).toEqual({
        status: 'success',
        data: { trackId: MOCK_TRACK_ID, blockedRegions: ['EG', 'US'] },
      });
    });

    it('should allow clearing blocked regions with empty array', async () => {
      trackRepo.findById.mockResolvedValue(mockOwnTrack());
      trackRepo.updateBlockedRegions.mockResolvedValue(mockOwnTrack({ blockedRegions: [] }));

      const result = await service.updateBlockedRegions(MOCK_TRACK_ID, MOCK_USER_ID, {
        blockedRegions: [],
      });

      expect(result.data.blockedRegions).toEqual([]);
    });

    it('should call updateBlockedRegions with correct args', async () => {
      trackRepo.findById.mockResolvedValue(mockOwnTrack());
      trackRepo.updateBlockedRegions.mockResolvedValue(mockOwnTrack({ blockedRegions: ['EG'] }));

      await service.updateBlockedRegions(MOCK_TRACK_ID, MOCK_USER_ID, { blockedRegions: ['EG'] });

      expect(trackRepo.updateBlockedRegions).toHaveBeenCalledWith(MOCK_TRACK_ID, ['EG']);
    });

    it('should throw NotFoundException when track not found', async () => {
      trackRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateBlockedRegions(MOCK_TRACK_ID, MOCK_USER_ID, { blockedRegions: [] })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own track', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());

      await expect(
        service.updateBlockedRegions(MOCK_TRACK_ID, MOCK_USER_ID, { blockedRegions: [] })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getAllGenres ─────────────────────────────────────────────────────────────

  describe('getAllGenres', () => {
    it('should return all genres', async () => {
      genreRepo.findAll.mockResolvedValue([
        mockGenre(),
        mockGenre({ genreId: 'id-2', name: 'Hip-Hop' }),
      ]);

      const result = await service.getAllGenres();

      expect(result.status).toBe('success');
      expect(result.data).toHaveLength(2);
    });

    it('should return empty array when no genres exist', async () => {
      genreRepo.findAll.mockResolvedValue([]);

      const result = await service.getAllGenres();

      expect(result.data).toEqual([]);
    });

    it('should call genreRepository.findAll', async () => {
      genreRepo.findAll.mockResolvedValue([]);

      await service.getAllGenres();

      expect(genreRepo.findAll).toHaveBeenCalledTimes(1);
    });
  });

  // ─── getUserUploadedTracks ────────────────────────────────────────────────────

  describe('getUserUploadedTracks', () => {
    it('should return paginated tracks for a public user', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser());
      trackRepo.getUserTracks.mockResolvedValue([[mockPublicTrack()], 1]);

      const result = await service.getUserUploadedTracks(
        MOCK_OTHER_USER_ID,
        MOCK_MY_USER_ID,
        1,
        20
      );

      expect(result.status).toBe('success');
      expect(result.data).toHaveLength(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(
        service.getUserUploadedTracks(MOCK_OTHER_USER_ID, MOCK_MY_USER_ID)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when profile is private and requester is not owner', async () => {
      userRepo.findById.mockResolvedValue(mockPrivateUser());

      await expect(
        service.getUserUploadedTracks(MOCK_OTHER_USER_ID, MOCK_MY_USER_ID)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow owner to get their own private profile tracks', async () => {
      userRepo.findById.mockResolvedValue(mockPrivateUser({ userId: MOCK_OTHER_USER_ID }));
      trackRepo.getUserTracks.mockResolvedValue([[], 0]);

      await expect(
        service.getUserUploadedTracks(MOCK_OTHER_USER_ID, MOCK_OTHER_USER_ID)
      ).resolves.not.toThrow();
    });

    it('should cap limit at 100', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser());
      trackRepo.getUserTracks.mockResolvedValue([[], 0]);

      await service.getUserUploadedTracks(MOCK_OTHER_USER_ID, MOCK_MY_USER_ID, 1, 200);

      expect(trackRepo.getUserTracks).toHaveBeenCalledWith(
        MOCK_OTHER_USER_ID,
        MOCK_MY_USER_ID,
        1,
        100
      );
    });
  });

  // ─── getUserQuota ─────────────────────────────────────────────────────────────

  describe('getUserQuota', () => {
    it('should return quota for free user', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser({ plan: 'free' }));
      trackRepo.getUserUploadedSeconds.mockResolvedValue(3600); // 60 min used

      const result = await service.getUserQuota(MOCK_OTHER_USER_ID);

      expect(result.status).toBe('success');
      expect(result.data).toMatchObject({
        plan: 'free',
        usedMinutes: 60,
        limitMinutes: 120,
        remainingMinutes: 60,
      });
    });

    it('should return quota for go+ user (180 min limit)', async () => {
      // mockGoUser returns { plan: 'go+' }
      userRepo.findById.mockResolvedValue(mockGoUser());
      trackRepo.getUserUploadedSeconds.mockResolvedValue(0);

      const result = await service.getUserQuota(MOCK_OTHER_USER_ID);

      expect(result.data).toMatchObject({
        plan: 'go+',
        limitMinutes: 180,
        remainingMinutes: 180,
      });
    });

    it('should return null limits for pro user (unlimited)', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser({ plan: 'pro' }));
      trackRepo.getUserUploadedSeconds.mockResolvedValue(1000);

      const result = await service.getUserQuota(MOCK_OTHER_USER_ID);

      expect(result.data).toMatchObject({
        plan: 'pro',
        limitMinutes: null,
        remainingMinutes: null,
      });
    });

    it('should floor remainingMinutes at 0 when over quota', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser({ plan: 'free' }));
      trackRepo.getUserUploadedSeconds.mockResolvedValue(9999999);

      const result = await service.getUserQuota(MOCK_OTHER_USER_ID);

      expect(result.data.remainingMinutes).toBe(0);
    });

    it('should fall back to free tier when plan is unrecognised', async () => {
      userRepo.findById.mockResolvedValue(mockPublicUser({ plan: undefined }));
      trackRepo.getUserUploadedSeconds.mockResolvedValue(0);

      const result = await service.getUserQuota(MOCK_OTHER_USER_ID);

      expect(result.data).toMatchObject({ limitMinutes: 120 });
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(service.getUserQuota(MOCK_OTHER_USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getTrackPlaylists ────────────────────────────────────────────────────────

  describe('getTrackPlaylists', () => {
    it('should return paginated playlists containing the track', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      playlistRepo.getTrackPlaylists.mockResolvedValue([[mockPlaylistEntry()], 1]);

      const result = await service.getTrackPlaylists(MOCK_TRACK_ID, MOCK_USER_ID, 1, 20);

      expect(result.status).toBe('success');
      expect(result.data).toHaveLength(1);
    });

    it('should throw NotFoundException when track not found', async () => {
      trackRepo.findById.mockResolvedValue(null);

      await expect(service.getTrackPlaylists(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when track is private and user is not owner', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack());

      await expect(service.getTrackPlaylists(MOCK_TRACK_ID, MOCK_USER_ID)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should allow owner to get playlists for private track', async () => {
      trackRepo.findById.mockResolvedValue(mockPrivateTrack({ userId: MOCK_USER_ID }));
      playlistRepo.getTrackPlaylists.mockResolvedValue([[], 0]);

      await expect(service.getTrackPlaylists(MOCK_TRACK_ID, MOCK_USER_ID)).resolves.not.toThrow();
    });

    it('should cap limit at 100', async () => {
      trackRepo.findById.mockResolvedValue(mockPublicTrack());
      playlistRepo.getTrackPlaylists.mockResolvedValue([[], 0]);

      await service.getTrackPlaylists(MOCK_TRACK_ID, MOCK_USER_ID, 1, 200);

      expect(playlistRepo.getTrackPlaylists).toHaveBeenCalledWith(
        MOCK_TRACK_ID,
        MOCK_USER_ID,
        1,
        100
      );
    });

    // Extra tests to cover upload/reupload behavior
    describe('uploadTrack and reuploadTrackAudio', () => {
      it('uploadTrack uploads cover, writes temp file and enqueues job', async () => {
        const savedTrack = mockPublicTrack();
        savedTrack.trackId = MOCK_TRACK_ID;
        trackRepo.createTrack.mockResolvedValue(savedTrack);
        // storageService is available via the service instance
        (service as any).storageService.uploadFile.mockResolvedValue({
          Location: 'https://s3/cover.jpg',
        });

        const audioFile = { originalname: 'track.mp3', buffer: Buffer.from('data') } as any;
        const coverFile = { originalname: 'cover.jpg' } as any;

        const res = await service.uploadTrack(MOCK_USER_ID, {} as any, audioFile, coverFile);

        expect((service as any).storageService.uploadFile).toHaveBeenCalledWith(coverFile);
        expect((service as any).audioQueue.add).toHaveBeenCalledWith(
          'processAudio',
          expect.objectContaining({
            trackId: savedTrack.trackId,
            originalName: audioFile.originalname,
          }),
          expect.any(Object)
        );
        expect(res.status).toBe('success');
        expect(res.data.trackId).toBe(savedTrack.trackId);
      });

      it('reuploadTrackAudio enqueues job and sets processing', async () => {
        const track = mockPublicTrack({
          userId: MOCK_USER_ID,
          trackStatus: TrackStatus.FINISHED,
          previewStartTime: '00:00:30',
        });
        trackRepo.findById.mockResolvedValue(track);
        (service as any).audioQueue.remove.mockResolvedValue(undefined);
        trackRepo.setTrackProcessing.mockResolvedValue(undefined);

        const audioFile = { originalname: 're.mp3', buffer: Buffer.from('data') } as any;

        const res = await service.reuploadTrackAudio(
          MOCK_TRACK_ID,
          MOCK_USER_ID,
          audioFile,
          '00:01:00'
        );

        expect(trackRepo.setTrackProcessing).toHaveBeenCalledWith(MOCK_TRACK_ID);
        expect((service as any).audioQueue.add).toHaveBeenCalledWith(
          'processAudio',
          expect.objectContaining({ trackId: MOCK_TRACK_ID, originalName: audioFile.originalname }),
          expect.any(Object)
        );
        expect(res.status).toBe('success');
        expect(res.data.trackId).toBe(MOCK_TRACK_ID);
      });
    });
  });
});
