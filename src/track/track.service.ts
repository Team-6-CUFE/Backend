import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TrackRepository } from './track.repository';
import { buildPaginationResponse } from '../common/utilities/pagination.util';

@Injectable()
export class TrackService {
  constructor(private readonly trackRepository: TrackRepository) {}

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
    return this.trackRepository.repostTrack(trackId, userId, caption);
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
      trackId,
      repostsCount,
    };
  }

  async removeTrackRepost(trackId: string, userId: string) {
    const checkRepost = await this.trackRepository.didUserRepostTrack(userId, trackId);
    if (!checkRepost) {
      throw new BadRequestException('You have not reposted this track');
    }
    await this.trackRepository.removeTrackRepost(trackId, userId);
    return {
      message: 'Repost successfully removed',
    };
  }

  async editTrackRepost(trackId: string, userId: string, caption: string) {
    const updatedRepost = await this.trackRepository.editTrackRepost(trackId, userId, caption);
    if (!updatedRepost) {
      throw new BadRequestException('You have not reposted this track');
    }
    return updatedRepost;
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
      userId: repost.user.user_id,
      username: repost.user.username,
      displayName: repost.user.display_name,
      avatarUrl: repost.user.avatar_url,
      caption: repost.caption,
      repostedAt: repost.createdAt,
    }));
    return buildPaginationResponse(mappedReposters, total, page, limit);
  }

  async getUserTrackReposts(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<[any[], number]> {
    return this.trackRepository.getUserTrackReposts(userId, page, limit);
  }
}
