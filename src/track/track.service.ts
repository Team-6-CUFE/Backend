import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TrackRepository } from './track.repository';
import { UserRepository } from '../user/user.repository';
import { buildPaginationResponse } from '../common/utilities/pagination.util';
import { AddCommentDto } from './dto/add-comment.dto';

@Injectable()
export class TrackService {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly userRepository: UserRepository
  ) {}

  async repostTrack(trackId: string, userId: string, caption?: string) {
    const track = await this.trackRepository.findById(trackId);
    if (!track) {
      throw new NotFoundException('Track not found');
    }

    if (track.userId === userId) {
      throw new BadRequestException('You cannot repost your own track');
    }

    if (!track.isPublic) {
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

    if (!track.isPublic && track.userId !== userId) {
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

    if (!track.isPublic && track.userId !== userId) {
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

    if (!user.isPublic && user.userId !== myUserId) {
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

    if (!track.isPublic) {
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

    if (!track.isPublic && track.userId !== userId) {
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

    if (!track.isPublic && track.userId !== userId) {
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

    if (!user.isPublic && user.userId !== myUserId) {
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

    if (!track.isPublic) {
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

    if (!track.isPublic) {
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
    if (!track.isPublic && track.userId !== userId) {
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
}
