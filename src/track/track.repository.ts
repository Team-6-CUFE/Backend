import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Track } from './entities/track.entity';
import { TrackRepost } from './entities/track-reposts.entity';

@Injectable()
export class TrackRepository {
  constructor(
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,

    @InjectRepository(TrackRepost)
    private readonly trackRepostRepository: Repository<TrackRepost>
  ) {}

  async findById(trackId: string): Promise<Track | null> {
    return this.trackRepository.findOne({
      where: { trackId },
    });
  }

  async repostTrack(trackId: string, userId: string, caption?: string): Promise<TrackRepost> {
    const trackRepost = this.trackRepostRepository.create({
      trackId,
      userId,
      caption,
    });
    return this.trackRepostRepository.save(trackRepost);
  }

  async didUserRepostTrack(userId: string, trackId: string): Promise<boolean> {
    const repost = await this.trackRepostRepository.findOne({
      where: { userId, trackId },
    });
    return !!repost;
  }

  async getTrackRepostsCount(trackId: string): Promise<number> {
    return this.trackRepostRepository.count({
      where: { trackId },
    });
  }

  async removeTrackRepost(trackId: string, userId: string): Promise<void> {
    await this.trackRepostRepository.delete({
      trackId,
      userId,
    });
  }
}
