import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { plainToInstance } from 'class-transformer';
import { AddCommentDto } from './dto/add-comment.dto';
import { buildPaginationResponse } from '../common/utilities/pagination.util';
import { UserRepository } from '../user/user.repository';
import { TrackRepository } from './track.repository';
import { UploadTrackDto } from './dto/upload-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { AudioJobData, PreviewJobData } from '../audio/audio.processor';
import { StorageService } from '../common/storage_service';
import { TrackVisibility } from './enums/track-visibility.enum';
import { TrackStatus } from './enums/track-status.enum';
import { Track } from './entities/track.entity';
import { User } from '../user/entities/user.entity';
import { UPLOAD_LIMIT_SECONDS } from './constants/quota.constants';
import { UserTrackResponseDto } from './dto/user-track-res.dto';
import { UploadQuotaResponseDto } from './dto/upload-quota.res.dto';
import { PlaylistOwnerDto } from './dto/playlist-owner.dto';
import { TrackPlaylistResponseDto } from './dto/track-playlist-res.dto';
import { PlaylistTrack } from '../playlist/entities/playlist-tracks.entity';
import { Playlist } from '../playlist/entities/playlist.entity';
import { GenreRepository } from '../genre/genre.repository';
import { JwtPayload } from '../authentication/strategies/jwt.strategy';
import { TrackGenreDto } from './dto/track-genre.dto';
import { TrackOwnerDto } from './dto/track-owner.dto';
import { GetTrackResDto } from './dto/get-track-res.dto';
import { TrackAudioResDto } from './dto/get-track-audio-res.dto';
import { BlockedRegionsDto } from './dto/blocked-regions.dto';
import { GenresResDto } from './dto/get-genres-res.dto';
import { TrackTagDto } from './dto/track-tag.dto';
import { getLocationFromIp } from '../common/utilities/geolocation.util';

@Injectable()
export class TrackService {
  playlistRepository: any;

  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly userRepository: UserRepository,
    private readonly storageService: StorageService,
    private readonly genreRepository: GenreRepository,
    @InjectQueue('audioQueue')
    private readonly audioQueue: Queue
  ) {}

  private resolveAudioUrl(track: Track, user?: JwtPayload): string | null {
    const isHqEligible = user?.plan === 'pro' || user?.plan === 'go+';
    if (isHqEligible && track.audioUrlHq) return track.audioUrlHq;
    return track.audioUrl ?? null;
  }

  async uploadTrack(
    userId: string,
    dto: UploadTrackDto,
    audioFile: Express.Multer.File,
    coverFile?: Express.Multer.File
  ) {
    // Step 1 — optionally upload cover image to S3 immediately
    let coverImageUrl: string | undefined;
    if (coverFile) {
      const uploaded = await this.storageService.uploadFile(coverFile);
      coverImageUrl = uploaded.Location;
    }

    // Step 2 — save temp audio file to disk for ffmpeg
    const tempDir = os.tmpdir();
    const tempFileName = `track_${Date.now()}_${audioFile.originalname}`;
    const tempFilePath = path.join(tempDir, tempFileName);
    fs.writeFileSync(tempFilePath, audioFile.buffer);

    // Step 3 — create track record in DB with PROCESSING status
    const savedTrack = await this.trackRepository.createTrack(userId, dto, coverImageUrl);

    // Step 4 — queue the background job; jobId === trackId for SSE keying
    const jobData: AudioJobData = {
      trackId: savedTrack.trackId,
      filePath: tempFilePath,
      originalName: audioFile.originalname,
      previewStartTime: dto.previewStartTime ?? '00:00:30',
    };

    await this.audioQueue.add('processAudio', jobData, {
      jobId: savedTrack.trackId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    });

    return {
      status: 'success',
      message: 'Track upload started. Processing in background.',
      data: {
        trackId: savedTrack.trackId,
        title: savedTrack.title,
        trackStatus: savedTrack.trackStatus,
        createdAt: savedTrack.createdAt,
      },
    };
  }

  /** Fetches a track — used by the SSE controller for late-subscriber check. */
  async getTrackById(trackId: string): Promise<Track> {
    const track = await this.trackRepository.findById(trackId);
    if (!track) throw new NotFoundException('Track not found');
    return track;
  }

  async updateTrackMetadata(
    trackId: string,
    userId: string,
    dto: UpdateTrackDto,
    coverFile?: Express.Multer.File
  ) {
    const track = await this.trackRepository.findById(trackId);
    if (!track) throw new NotFoundException('Track not found');
    if (track.userId !== userId) throw new ForbiddenException('You do not own this track');

    // Upload new cover and delete old one atomically
    let coverImageUrl: string | undefined;
    if (coverFile) {
      const uploaded = await this.storageService.uploadFile(coverFile);
      coverImageUrl = uploaded.Location;
      if (track.coverImage) {
        await this.storageService.deleteFile(track.coverImage);
      }
    }

    const updated = await this.trackRepository.updateTrack(trackId, dto, coverImageUrl);

    // If previewStartTime changed on a finished track, regenerate the preview clip
    const previewChanged =
      dto.previewStartTime &&
      dto.previewStartTime !== track.previewStartTime &&
      track.trackStatus === TrackStatus.FINISHED &&
      track.audioUrl;

    if (previewChanged) {
      const previewJobData: PreviewJobData = {
        trackId,
        audioUrl: track.audioUrl,
        startTime: dto.previewStartTime!,
        oldPreviewUrl: track.previewAudioUrl ?? undefined,
      };
      await this.audioQueue.add('regeneratePreview', previewJobData, {
        jobId: `preview_${trackId}_${Date.now()}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
    }

    return { status: 'success', data: updated };
  }

  async reuploadTrackAudio(
    trackId: string,
    userId: string,
    audioFile: Express.Multer.File,
    previewStartTime?: string
  ) {
    const track = await this.trackRepository.findById(trackId);
    if (!track) throw new NotFoundException('Track not found');
    if (track.userId !== userId) throw new ForbiddenException('You do not own this track');
    if (track.trackStatus === TrackStatus.PROCESSING) {
      throw new ConflictException('Track is currently being processed. Please wait.');
    }

    // Remove any existing failed/stuck job so the new one can use the same jobId
    try {
      await this.audioQueue.remove(trackId);
    } catch {
      /* no-op */
    }

    const tempDir = os.tmpdir();
    const tempFileName = `track_${Date.now()}_${audioFile.originalname}`;
    const tempFilePath = path.join(tempDir, tempFileName);
    fs.writeFileSync(tempFilePath, audioFile.buffer);

    await this.trackRepository.setTrackProcessing(trackId);

    const jobData: AudioJobData = {
      trackId,
      filePath: tempFilePath,
      originalName: audioFile.originalname,
      previewStartTime: previewStartTime ?? track.previewStartTime ?? '00:00:30',
    };

    await this.audioQueue.add('processAudio', jobData, {
      jobId: trackId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    });

    return {
      status: 'success',
      message: 'Audio re-upload started. Processing in background.',
      data: { trackId, trackStatus: TrackStatus.PROCESSING },
    };
  }

  async repostTrack(trackId: string, userId: string, caption?: string) {
    const track = await this.trackRepository.findById(trackId);
    if (!track) {
      throw new NotFoundException('Track not found');
    }

    if (track.userId === userId) {
      throw new BadRequestException('You cannot repost your own track');
    }

    if (track.visibility !== TrackVisibility.PUBLIC) {
      throw new ForbiddenException('This track is private');
    }

    const alreadyReposted = await this.trackRepository.didUserRepostTrack(userId, trackId);
    if (alreadyReposted) {
      throw new ConflictException('You have already reposted this track');
    }
    return {
      status: 'success',
      data: await this.trackRepository.repostTrack(trackId, userId, caption),
    };
  }

  async getTrackRepostsCount(trackId: string, userId: string) {
    const track = await this.trackRepository.findById(trackId);
    if (!track) {
      throw new NotFoundException('Track not found');
    }

    if (track.visibility === TrackVisibility.PRIVATE && track.userId !== userId) {
      throw new ForbiddenException('This track is private');
    }
    const repostsCount = await this.trackRepository.getTrackRepostsCount(trackId);
    return {
      status: 'success',
      data: { trackId, repostsCount },
    };
  }

  async removeTrackRepost(trackId: string, userId: string) {
    const checkRepost = await this.trackRepository.didUserRepostTrack(userId, trackId);
    if (!checkRepost) {
      throw new BadRequestException('You have not reposted this track');
    }
    await this.trackRepository.removeTrackRepost(trackId, userId);
    return {
      status: 'success',
      message: 'Repost successfully removed',
    };
  }

  async editTrackRepost(trackId: string, userId: string, caption: string) {
    const updatedRepost = await this.trackRepository.editTrackRepost(trackId, userId, caption);
    if (!updatedRepost) {
      throw new BadRequestException('You have not reposted this track');
    }
    return { status: 'success', data: updatedRepost };
  }

  async getTrackReposts(trackId: string, userId: string, page: number = 1, limit: number = 20) {
    const track = await this.trackRepository.findById(trackId);
    if (!track) {
      throw new NotFoundException('Track not found');
    }

    if (track.visibility === TrackVisibility.PRIVATE && track.userId !== userId) {
      throw new ForbiddenException('This track is private');
    }

    const cappedLimit = Math.min(limit, 100); // Cap limit to 100

    const [reposts, total] = await this.trackRepository.getTrackReposts(trackId, page, cappedLimit);
    const mappedReposters = reposts.map((repost) => ({
      userId: repost.user.userId,
      username: repost.user.username,
      displayName: repost.user.displayName,
      avatarUrl: repost.user.avatarUrl,
      followersCount: repost.user.followersCount,
      caption: repost.caption,
      repostedAt: repost.createdAt,
    }));
    return { status: 'success', ...buildPaginationResponse(mappedReposters, total, page, limit) };
  }

  async getUserTrackReposts(
    userId: string,
    myUserId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isPublic === false && user.userId !== myUserId) {
      throw new ForbiddenException('This account is private');
    }

    const cappedLimit = Math.min(limit, 100);
    const [reposts, total] = await this.trackRepository.getUserTrackReposts(
      userId,
      page,
      cappedLimit
    );
    const mappedReposts = reposts.map((repost) => ({
      trackId: repost.track.trackId,
      title: repost.track.title,
      coverImage: repost.track.coverImage,
      durationSeconds: repost.track.durationSeconds,
      playCount: repost.track.playCount,
      repostsCount: repost.track.repostsCount,
      artist: {
        userId: repost.track.user.userId,
        username: repost.track.user.username,
        displayName: repost.track.user.displayName,
      },
      caption: repost.caption,
      repostedAt: repost.createdAt,
    }));
    return { status: 'success', ...buildPaginationResponse(mappedReposts, total, page, limit) };
  }

  async likeTrack(trackId: string, userId: string) {
    const track = await this.trackRepository.findById(trackId);
    if (!track) {
      throw new NotFoundException('Track not found');
    }

    if (track.userId === userId) {
      throw new BadRequestException('You cannot like your own track');
    }

    if (track.visibility !== TrackVisibility.PUBLIC) {
      throw new ForbiddenException('This track is private');
    }

    const alreadyLiked = await this.trackRepository.didUserLikeTrack(userId, trackId);
    if (alreadyLiked) {
      throw new ConflictException('You have already liked this track');
    }
    return {
      status: 'success',
      data: await this.trackRepository.likeTrack(trackId, userId),
    };
  }

  async getTrackLikesCount(trackId: string, userId: string) {
    const track = await this.trackRepository.findById(trackId);
    if (!track) {
      throw new NotFoundException('Track not found');
    }

    if (track.visibility === TrackVisibility.PRIVATE && track.userId !== userId) {
      throw new ForbiddenException('This track is private');
    }
    const likesCount = await this.trackRepository.getTrackLikesCount(trackId);
    return {
      status: 'success',
      data: { trackId, likesCount },
    };
  }

  async removeTrackLike(trackId: string, userId: string) {
    const checkLike = await this.trackRepository.didUserLikeTrack(userId, trackId);
    if (!checkLike) {
      throw new BadRequestException('You have not liked this track');
    }
    await this.trackRepository.removeTrackLike(trackId, userId);
    return {
      status: 'success',
      message: 'Track successfully unliked',
    };
  }

  async getTrackLikes(trackId: string, userId: string, page: number = 1, limit: number = 20) {
    const track = await this.trackRepository.findById(trackId);
    if (!track) {
      throw new NotFoundException('Track not found');
    }

    if (track.visibility === TrackVisibility.PRIVATE && track.userId !== userId) {
      throw new ForbiddenException('This track is private');
    }

    const cappedLimit = Math.min(limit, 100); // Cap limit to 100

    const [likes, total] = await this.trackRepository.getTrackLikes(trackId, page, cappedLimit);
    const mappedReposters = likes.map((like) => ({
      userId: like.user.userId,
      username: like.user.username,
      displayName: like.user.displayName,
      avatarUrl: like.user.avatarUrl,
      followersCount: like.user.followersCount,
      likedAt: like.createdAt,
    }));
    return { status: 'success', ...buildPaginationResponse(mappedReposters, total, page, limit) };
  }

  async getUserTrackLikes(userId: string, myUserId: string, page: number = 1, limit: number = 20) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isPublic === false && user.userId !== myUserId) {
      throw new ForbiddenException('This account is private');
    }

    const cappedLimit = Math.min(limit, 100);
    const [likes, total] = await this.trackRepository.getUserTrackLikes(userId, page, cappedLimit);
    const mappedLikes = likes.map((like) => ({
      trackId: like.track.trackId,
      title: like.track.title,
      coverImage: like.track.coverImage,
      durationSeconds: like.track.durationSeconds,
      playCount: like.track.playCount,
      repostsCount: like.track.repostsCount,
      artist: {
        userId: like.track.user.userId,
        username: like.track.user.username,
        displayName: like.track.user.displayName,
      },
      likedAt: like.createdAt,
    }));
    return { status: 'success', ...buildPaginationResponse(mappedLikes, total, page, limit) };
  }

  async addComment(trackId: string, userId: string, commentDto: AddCommentDto) {
    const track = await this.trackRepository.findById(trackId);
    if (!track) {
      throw new NotFoundException('Track not found');
    }

    if (track.visibility !== TrackVisibility.PUBLIC) {
      throw new ForbiddenException('This track is private');
    }

    if (commentDto.parentId) {
      const parentComment = await this.trackRepository.findCommentById(commentDto.parentId);
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
    }
    const comment = await this.trackRepository.addComment(trackId, userId, commentDto);
    return { status: 'success', data: comment };
  }

  async deleteComment(trackId: string, commentId: string, userId: string) {
    const track = await this.trackRepository.findById(trackId);
    if (!track) {
      throw new NotFoundException('Track not found');
    }

    if (track.visibility !== TrackVisibility.PUBLIC) {
      throw new ForbiddenException('This track is private');
    }
    const comment = await this.trackRepository.findCommentById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.trackId !== trackId) {
      throw new ConflictException('This comment does not belong to this track');
    }
    if (comment.userId !== userId) {
      throw new ForbiddenException('You are not authorized to delete this comment');
    }
    await this.trackRepository.deleteComment(trackId, commentId, userId);
    return {
      status: 'success',
      message: 'comment deleted successfully',
    };
  }

  async getTrackComments(
    trackId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
    order: 'timestamp' | 'newest' | 'oldest' = 'timestamp'
  ) {
    const track = await this.trackRepository.findById(trackId);
    if (!track) throw new NotFoundException('Track not found');

    // Private track logic
    if (track.visibility === TrackVisibility.PRIVATE && track.userId !== userId) {
      throw new ForbiddenException('This track is private');
    }

    const cappedLimit = Math.min(limit, 100);

    // Fetch comments and total count
    const [comments, total] = await this.trackRepository.getTrackComments(
      trackId,
      page,
      cappedLimit,
      order
    );

    const mappedComments = comments.map((comment) => ({
      commentId: comment.commentId,
      content: comment.content,
      timestampSeconds: comment.timestampSeconds,
      parentId: comment.parentId,
      user: {
        userId: comment.user.userId,
        username: comment.user.username,
        displayName: comment.user.displayName,
        avatarUrl: comment.user.avatarUrl,
      },
      createdAt: comment.createdAt,
      replies: (comment.replies ?? []).map((reply) => ({
        commentId: reply.commentId,
        content: reply.content,
        timestampSeconds: reply.timestampSeconds,
        parentId: reply.parentId,
        user: {
          userId: reply.user.userId,
          username: reply.user.username,
          displayName: reply.user.displayName,
          avatarUrl: reply.user.avatarUrl,
        },
        createdAt: reply.createdAt,
      })),
    }));

    return {
      status: 'success',
      ...buildPaginationResponse(mappedComments, total, page, cappedLimit),
    };
  }

  async getTrackPlaylists(
    trackId: string,
    currentUserId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const track = await this.trackRepository.findById(trackId);
    if (!track) throw new NotFoundException('Track not found');

    if (track.visibility === TrackVisibility.PRIVATE && track.userId !== currentUserId) {
      throw new ForbiddenException('This track is private');
    }

    const cappedLimit = Math.min(limit, 100);
    const [entries, total] = await this.playlistRepository.getTrackPlaylists(
      trackId,
      currentUserId,
      page,
      cappedLimit
    );

    const shaped = (entries as Array<PlaylistTrack & { playlist: Playlist & { user: User } }>).map(
      (entry) => ({
        playlistId: entry.playlist.playlistId,
        title: entry.playlist.title,
        description: entry.playlist.description ?? null,
        coverImage: entry.playlist.coverImage ?? null,
        isPublic: entry.playlist.isPublic,
        tracksCount: entry.playlist.tracksCount,
        totalDurationSeconds: entry.playlist.totalDurationSeconds,
        owner: plainToInstance(PlaylistOwnerDto, entry.playlist.user, {
          excludeExtraneousValues: true,
        }),
        addedAt: entry.addedAt,
      })
    );

    const data: TrackPlaylistResponseDto[] = plainToInstance(TrackPlaylistResponseDto, shaped, {
      excludeExtraneousValues: true,
    });

    return { status: 'success', ...buildPaginationResponse(data, total, page, cappedLimit) };
  }

  async getUserUploadedTracks(
    userId: string,
    currentUserId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User does not exist');

    if (!user.isPublic && user.userId !== currentUserId) {
      throw new ForbiddenException('This account is private');
    }

    const cappedLimit = Math.min(limit, 100);
    const [tracks, total] = await this.trackRepository.getUserTracks(
      userId,
      currentUserId,
      page,
      cappedLimit
    );

    const data = plainToInstance(UserTrackResponseDto, tracks, {
      excludeExtraneousValues: true,
    });

    return { status: 'success', ...buildPaginationResponse(data, total, page, cappedLimit) };
  }

  async getUserQuota(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User does not exist');

    const usedSeconds = await this.trackRepository.getUserUploadedSeconds(userId);
    const plan = user.plan ?? 'free';
    const limitSeconds =
      plan in UPLOAD_LIMIT_SECONDS ? UPLOAD_LIMIT_SECONDS[plan] : UPLOAD_LIMIT_SECONDS.free;

    const usedMinutes = Math.floor(usedSeconds / 60);
    const limitMinutes = limitSeconds !== null ? Math.floor(limitSeconds / 60) : null;
    const remainingMinutes =
      limitSeconds !== null ? Math.max(0, Math.floor((limitSeconds - usedSeconds) / 60)) : null;

    const data = plainToInstance(
      UploadQuotaResponseDto,
      { plan, usedMinutes, limitMinutes, remainingMinutes },
      { excludeExtraneousValues: true }
    );

    return { status: 'success', data };
  }

  async getTrack(trackId: string, user?: JwtPayload, ip?: string) {
    const track = await this.trackRepository.findByIdWithRelations(trackId);
    if (!track) throw new NotFoundException('Track not found');

    if (track.visibility === TrackVisibility.PRIVATE && track.userId !== user?.sub) {
      throw new ForbiddenException('This track is private');
    }
    if (track.userId !== user?.sub && track.blockedRegions?.length > 0 && ip) {
      const { country } = getLocationFromIp(ip);
      if (country && track.blockedRegions.includes(country)) {
        throw new ForbiddenException('This track is not available in your region');
      }
    }
    const shaped: GetTrackResDto = {
      ...track,
      genres: plainToInstance(TrackGenreDto, track.genres, { excludeExtraneousValues: true }),
      tags: plainToInstance(TrackTagDto, track.tags, { excludeExtraneousValues: true }),
      owner: plainToInstance(TrackOwnerDto, track.user, { excludeExtraneousValues: true }),
    };
    const data = plainToInstance(GetTrackResDto, shaped, { excludeExtraneousValues: true });
    return { status: 'success', data };
  }

  async getTrackAudio(trackId: string, user?: JwtPayload) {
    const track = await this.trackRepository.findById(trackId);
    if (!track) throw new NotFoundException('Track not found');

    if (track.visibility === TrackVisibility.PRIVATE && track.userId !== user?.sub) {
      throw new ForbiddenException('This track is private');
    }

    if (track.trackStatus !== TrackStatus.FINISHED) {
      throw new ConflictException('Track audio is not available yet');
    }

    const data = plainToInstance(
      TrackAudioResDto,
      {
        audioUrl: this.resolveAudioUrl(track, user),
        previewAudioUrl: track.previewAudioUrl ?? null,
        durationSeconds: track.durationSeconds,
      },
      { excludeExtraneousValues: true }
    );

    return { status: 'success', data };
  }

  async updateBlockedRegions(trackId: string, userId: string, dto: BlockedRegionsDto) {
    const track = await this.trackRepository.findById(trackId);
    if (!track) throw new NotFoundException('Track not found');
    if (track.userId !== userId) throw new ForbiddenException('You do not own this track');

    const updated = await this.trackRepository.updateBlockedRegions(trackId, dto.blockedRegions);
    return {
      status: 'success',
      data: { trackId: updated.trackId, blockedRegions: updated.blockedRegions },
    };
  }

  async getAllGenres() {
    const genres = await this.genreRepository.findAll();
    const data: GenresResDto[] = plainToInstance(GenresResDto, genres, {
      excludeExtraneousValues: true,
    });
    return { status: 'success', data };
  }
}
