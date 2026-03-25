import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TrackRepository } from './track.repository';
import { UserService } from '../user/user.service';

@Injectable()
export class TrackService {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly userService: UserService
  ) {}

  async repostTrack(trackId: string, userId: string, caption?: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const track = await this.trackRepository.findById(trackId);
    if (!track) {
      throw new BadRequestException('Track not found');
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
      throw new BadRequestException('Track not found');
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
}
