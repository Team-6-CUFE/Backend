import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Track } from './entities/track.entity';
import { TrackRepost } from './entities/track-reposts.entity';
import { TrackLikes } from './entities/track-likes.entity';
import { TrackComment } from './entities/track-comments.entity';
import { AddCommentDto } from './dto/add-comment.dto';
import { UploadTrackDto } from './dto/upload-track.dto';
import { TrackStatus } from './enums/track-status.enum';
import { TrackVisibility } from './enums/track-visibility.enum';

@Injectable()
export class TrackRepository {
  constructor(
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,

    @InjectRepository(TrackRepost)
    private readonly trackRepostRepository: Repository<TrackRepost>,

    @InjectRepository(TrackLikes)
    private readonly trackLikesRepository: Repository<TrackLikes>,

    @InjectRepository(TrackComment)
    private readonly trackCommentRepository: Repository<TrackComment>
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

  async editTrackRepost(
    trackId: string,
    userId: string,
    caption: string
  ): Promise<TrackRepost | null> {
    const repost = await this.trackRepostRepository.findOne({
      where: { trackId, userId },
    });
    if (!repost) {
      return null;
    }
    repost.caption = caption;
    return this.trackRepostRepository.save(repost);
  }

  async getTrackReposts(trackId: string, page: number, limit: number): Promise<[any[], number]> {
    const skip = (page - 1) * limit;
    const [reposts, total] = await this.trackRepostRepository.findAndCount({
      where: { trackId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return [reposts, total];
  }

  async getUserTrackReposts(
    userId: string,
    page: number,
    limit: number
  ): Promise<[TrackRepost[], number]> {
    const skip = (page - 1) * limit;

    return this.trackRepostRepository
      .createQueryBuilder('repost')
      .innerJoinAndSelect('repost.track', 'track')
      .innerJoinAndSelect('track.user', 'artist')
      .where('repost.userId = :userId', { userId })
      .orderBy('repost.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
  }

  async didUserLikeTrack(userId: string, trackId: string): Promise<boolean> {
    const like = await this.trackLikesRepository.findOne({
      where: { userId, trackId },
    });
    return !!like;
  }

  async likeTrack(trackId: string, userId: string): Promise<TrackLikes> {
    const trackLike = this.trackLikesRepository.create({
      trackId,
      userId,
    });
    return this.trackLikesRepository.save(trackLike);
  }

  async getTrackLikesCount(trackId: string): Promise<number> {
    return this.trackLikesRepository.count({
      where: { trackId },
    });
  }

  async removeTrackLike(trackId: string, userId: string): Promise<void> {
    await this.trackLikesRepository.delete({
      trackId,
      userId,
    });
  }

  async getTrackLikes(trackId: string, page: number, limit: number): Promise<[any[], number]> {
    const skip = (page - 1) * limit;
    const [likes, total] = await this.trackLikesRepository.findAndCount({
      where: { trackId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return [likes, total];
  }

  async getUserTrackLikes(
    userId: string,
    page: number,
    limit: number
  ): Promise<[TrackLikes[], number]> {
    const skip = (page - 1) * limit;

    return this.trackLikesRepository
      .createQueryBuilder('like')
      .innerJoinAndSelect('like.track', 'track')
      .innerJoinAndSelect('track.user', 'artist')
      .where('like.userId = :userId', { userId })
      .orderBy('like.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
  }

  async findCommentById(commentId: string): Promise<TrackComment | null> {
    return this.trackCommentRepository.findOne({
      where: { commentId },
    });
  }

  async addComment(
    trackId: string,
    userId: string,
    commentDto: AddCommentDto
  ): Promise<TrackComment> {
    const comment = this.trackCommentRepository.create({
      trackId,
      userId,
      content: commentDto.content,
      parentId: commentDto.parentId,
      timestampSeconds: commentDto.timestampSeconds,
    });
    const savedComment = await this.trackCommentRepository.save(comment);
    return savedComment;
  }

  async deleteComment(trackId: string, commentId: string, userId: string): Promise<void> {
    await this.trackCommentRepository.delete({
      trackId,
      commentId,
      userId,
    });

    const replies = await this.trackCommentRepository.find({
      where: { parentId: commentId },
    });

    // Use map to create an array of promises, then execute them in parallel
    await Promise.all(replies.map((reply) => this.trackCommentRepository.delete(reply.commentId)));
  }

  async getTrackComments(
    trackId: string,
    page: number,
    limit: number,
    order: 'timestamp' | 'newest' | 'oldest'
  ): Promise<[TrackComment[], number]> {
    const skip = (page - 1) * limit;
    const query = this.trackCommentRepository
      .createQueryBuilder('comment')
      .innerJoinAndSelect('comment.user', 'user')
      .leftJoinAndSelect('comment.replies', 'reply')
      .leftJoinAndSelect('reply.user', 'replyUser')
      .where('comment.trackId = :trackId AND comment.parentId IS NULL', { trackId });
    if (order === 'newest') {
      query.orderBy('comment.createdAt', 'DESC');
    } else if (order === 'oldest') {
      query.orderBy('comment.createdAt', 'ASC');
    } else {
      query.orderBy('comment.timestampSeconds', 'ASC');
    }

    return query.skip(skip).take(limit).getManyAndCount();
  }

  async createTrack(userId: string, dto: UploadTrackDto, coverImageUrl?: string): Promise<Track> {
    const track = this.trackRepository.create({
      userId,
      title: dto.title,
      description: dto.description,
      trackStatus: TrackStatus.PROCESSING,
      visibility: dto.visibility ?? TrackVisibility.PUBLIC,
      coverImage: coverImageUrl,
      mainArtists: dto.mainArtists,
      buyLink: dto.buyLink,
      recordLabel: dto.recordLabel,
      releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : undefined,
      publisher: dto.publisher,
      isrc: dto.isrc,
      explicitContent: dto.explicitContent ?? false,
      pLine: dto.pLine,
      trackLink: dto.trackLink,
      enableDirectDownloads: dto.enableDirectDownloads ?? false,
      offlineListening: dto.offlineListening ?? false,
      attribution: dto.attribution ?? false,
      noncommercial: dto.noncommercial ?? false,
      noDerivativeWorks: dto.noDerivativeWorks ?? false,
      shareAlike: dto.shareAlike ?? false,
    });
    return this.trackRepository.save(track);
  }
}
