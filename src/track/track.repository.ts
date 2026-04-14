import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Track } from './entities/track.entity';
import { TrackRepost } from './entities/track-reposts.entity';
import { TrackLikes } from './entities/track-likes.entity';
import { TrackComment } from './entities/track-comments.entity';
import { Tag } from './entities/tag.entity';
import { Genre } from '../genre/entities/genre.entity';
import { AddCommentDto } from './dto/add-comment.dto';
import { UploadTrackDto } from './dto/upload-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { TrackStatus } from './enums/track-status.enum';
import { TrackVisibility } from './enums/track-visibility.enum';
import { TrackPlay } from './entities/track-play.entity';
import { RecentlyPlayed, RecentlyPlayedItemType } from './entities/recently-played.entity';

const RECENTLY_PLAYED_LIMIT = 6;

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
    private readonly trackCommentRepository: Repository<TrackComment>,

    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,

    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,

    @InjectRepository(TrackPlay)
    private readonly trackPlayRepository: Repository<TrackPlay>,

    @InjectRepository(RecentlyPlayed)
    private readonly recentlyPlayedRepository: Repository<RecentlyPlayed>
  ) {}

  async findById(trackId: string): Promise<Track | null> {
    return this.trackRepository.findOne({
      where: { trackId },
    });
  }

  async findByIdWithRelations(trackId: string): Promise<Track | null> {
    return this.trackRepository
      .createQueryBuilder('track')
      .leftJoinAndSelect('track.genre', 'genre')
      .leftJoinAndSelect('track.tags', 'tag')
      .leftJoinAndSelect('track.user', 'user')
      .where('track.trackId = :trackId', { trackId })
      .getOne();
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

    const savedTrack = await this.trackRepository.save(track);

    if (dto.genreName && dto.genreName !== 'None') {
      savedTrack.genreId = await this.findOrCreateGenre(dto.genreName).then((g) => g.genreId);
    }
    if (dto.tags?.length) {
      savedTrack.tags = await this.findOrCreateTags(dto.tags);
    }
    if (dto.genreName || dto.tags?.length) {
      await this.trackRepository.save(savedTrack);
    }

    return savedTrack;
  }

  async updateTrack(trackId: string, dto: UpdateTrackDto, coverImageUrl?: string): Promise<Track> {
    const { genreName, tags: tagNames, ...scalarDto } = dto;

    const updates: Partial<Track> = { ...(scalarDto as Partial<Track>) };
    if (coverImageUrl !== undefined) updates.coverImage = coverImageUrl;
    if (dto.releaseDate !== undefined)
      updates.releaseDate = new Date(dto.releaseDate) as unknown as Date;

    await this.trackRepository.update(trackId, updates);

    const track = (await this.trackRepository.findOne({
      where: { trackId },
      relations: ['genre', 'tags'],
    })) as Track;

    if (genreName !== undefined && genreName !== 'None') {
      const genre = await this.findOrCreateGenre(genreName);
      track.genreId = genre.genreId;
      track.genre = genre as unknown as (typeof track)['genre'];
    }
    if (genreName === 'None') {
      track.genreId = null;
      track.genre = null as unknown as (typeof track)['genre'];
    }
    if (tagNames !== undefined) {
      track.tags = tagNames.length ? await this.findOrCreateTags(tagNames) : [];
    }
    if (genreName !== undefined || tagNames !== undefined) {
      await this.trackRepository.save(track);
    }

    return track;
  }

  async setTrackProcessing(trackId: string): Promise<void> {
    await this.trackRepository.update(trackId, { trackStatus: TrackStatus.PROCESSING });
  }

  private async findOrCreateTags(names: string[]): Promise<Tag[]> {
    const trimmed = names.map((n) => n.trim()).filter(Boolean);
    const existing = await this.tagRepository.findBy({ name: In(trimmed) });
    const existingNames = new Set(existing.map((t) => t.name));
    const created = await Promise.all(
      trimmed
        .filter((n) => !existingNames.has(n))
        .map((name) => this.tagRepository.save(this.tagRepository.create({ name })))
    );
    return [...existing, ...created];
  }

  private async findOrCreateGenre(names: string): Promise<Genre> {
    const trimmed = names.trim();
    const existing = await this.genreRepository.findBy({ name: In([trimmed]) });
    if (existing.length) {
      return existing[0];
    }
    return this.genreRepository.save(this.genreRepository.create({ name: trimmed }));
  }

  async createTrackPlay(trackId: string, userId: string, playlistId?: string): Promise<TrackPlay> {
    const trackPlay = this.trackPlayRepository.create({
      trackId,
      userId,
      playlistId: playlistId ?? null,
    });
    await this.trackPlayRepository.save(trackPlay);

    return trackPlay;
  }

  async addToRecentlyPlayed(
    userId: string,
    itemId: string,
    itemType: RecentlyPlayedItemType
  ): Promise<void> {
    await this.recentlyPlayedRepository
      .createQueryBuilder()
      .insert()
      .into(RecentlyPlayed)
      .values({ userId, itemId, itemType, playedAt: new Date() })
      .orUpdate(['played_at'], ['user_id', 'item_id', 'item_type'])
      .execute();
  }

  async deleteOldRecentlyPlayed(userId: string): Promise<void> {
    // Keep only the 6 most recent slots per user — delete anything older
    await this.recentlyPlayedRepository
      .createQueryBuilder()
      .delete()
      .where(
        `user_id = :userId AND (item_id, item_type::text) NOT IN (
          SELECT item_id, item_type::text FROM recently_played
          WHERE user_id = :userId
          ORDER BY played_at DESC
          LIMIT :limit
        )`,
        { userId, limit: RECENTLY_PLAYED_LIMIT }
      )
      .execute();
  }

  async getUserUploadedSeconds(userId: string): Promise<number> {
    const sum = await this.trackRepository.sum('durationSeconds', {
      userId,
      trackStatus: TrackStatus.FINISHED,
    });
    return sum ?? 0;
  }

  async getUserTracks(
    userId: string,
    requesterId: string,
    page: number,
    limit: number
  ): Promise<[Track[], number]> {
    const skip = (page - 1) * limit;
    const isOwner = userId === requesterId;

    const query = this.trackRepository
      .createQueryBuilder('track')
      .where('track.userId = :userId', { userId })
      .andWhere('track.trackStatus = :status', { status: TrackStatus.FINISHED });

    if (!isOwner) {
      query.andWhere('track.visibility = :visibility', { visibility: TrackVisibility.PUBLIC });
    }

    return query.orderBy('track.createdAt', 'DESC').skip(skip).take(limit).getManyAndCount();
  }

  async updateBlockedRegions(trackId: string, regions: string[]): Promise<Track> {
    await this.trackRepository.update(trackId, { blockedRegions: regions });
    return (await this.trackRepository.findOne({ where: { trackId } })) as Track;
  }

  async deleteTrack(trackId: string): Promise<void> {
    await this.trackRepository.delete(trackId);
  }

  async findTrackByTitleAndArtist(title: string, artistUsername: string): Promise<Track | null> {
    return this.trackRepository
      .createQueryBuilder('track')
      .innerJoin('track.user', 'user')
      .where('track.title = :title', { title })
      .andWhere('user.username = :artistUsername', { artistUsername })
      .getOne();
  }

  async getTrackTopFansIds(trackId: string): Promise<string[]> {
    const rows = await this.trackPlayRepository
      .createQueryBuilder('play')
      .select('play.userId', 'userId')
      .where('play.trackId = :trackId', { trackId })
      .groupBy('play.userId')
      .orderBy('COUNT(*)', 'DESC')
      .limit(80)
      .getRawMany();
    return rows.map((row) => row.userId);
  }

  async findRelatedTracks(trackId: string, topFanIds: string[]): Promise<Track[]> {
    const result: TrackPlay[] = await this.trackPlayRepository
      .createQueryBuilder('play')
      .select('play.trackId', 'trackId')
      .where('play.trackId != :trackId', { trackId })
      .andWhere('play.userId IN (:...topFanIds)', { topFanIds })
      .groupBy('play.trackId')
      .orderBy('COUNT(*)', 'DESC')
      .limit(40)
      .getRawMany();

    const relatedTrackIds = result.map((r) => r.trackId);

    if (relatedTrackIds.length === 0) {
      return [];
    }

    return this.trackRepository
      .createQueryBuilder('track')
      .where('track.trackId IN (:...relatedTrackIds)', { relatedTrackIds })
      .getMany();
  }
}
