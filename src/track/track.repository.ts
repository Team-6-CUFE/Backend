import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { Track } from './entities/track.entity';
import { TrackRepost } from './entities/track-reposts.entity';
import { TrackLikes } from './entities/track-likes.entity';
import { TrackComment } from './entities/track-comments.entity';
import { Genre } from '../genre/entities/genre.entity';
import { AddCommentDto } from './dto/add-comment.dto';
import { UploadTrackDto } from './dto/upload-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { TrackStatus } from './enums/track-status.enum';
import { TrackVisibility } from './enums/track-visibility.enum';
import { TrackPlay } from './entities/track-play.entity';
import { RecentlyPlayed, RecentlyPlayedItemType } from './entities/recently-played.entity';
import { mapTrack, addDocuments, updateDocument, deleteDocument } from '../search/indexing';
import { DownloadedTrack } from '../download/entities/downloaded-tracks.entity';
import { ReportType } from '../admin/report-enums';
import { PlaylistType } from '../playlist/entities/playlist.entity';
import { SpotlightTrack } from './entities/spotlght-track.entity';

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

    @InjectRepository(TrackPlay)
    private readonly trackPlayRepository: Repository<TrackPlay>,

    @InjectRepository(RecentlyPlayed)
    private readonly recentlyPlayedRepository: Repository<RecentlyPlayed>,

    @InjectRepository(DownloadedTrack)
    private readonly downloadedTrackRepository: Repository<DownloadedTrack>,
    @InjectRepository(SpotlightTrack)
    private readonly spotlightTracksRepository: Repository<SpotlightTrack>
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

  async findTracksByGenreOrTags(
    genreIds: (string | null)[],
    tags: Genre[],
    page: number,
    limit: number,
    orderBy: 'popular' | 'recent' = 'popular'
  ): Promise<[Track[], number]> {
    if ((!genreIds || genreIds.length === 0) && (!tags || tags.length === 0)) {
      return [[], 0];
    }

    const skip = (page - 1) * limit;
    const query = this.trackRepository
      .createQueryBuilder('track')
      .leftJoinAndSelect('track.tags', 'tag')
      .leftJoinAndSelect('track.genre', 'genre');

    query.andWhere(
      new Brackets((qb) => {
        let hasCondition = false;

        if (genreIds && genreIds.length > 0) {
          qb.where('track.genreId IN (:...genreIds)', { genreIds });
          hasCondition = true;
        }

        if (tags && tags.length > 0) {
          const tagIds = tags.filter((t) => t && t.genreId).map((t) => t.genreId);
          if (tagIds.length > 0) {
            if (hasCondition) {
              qb.orWhere('tag.genreId IN (:...tagIds)', { tagIds });
            } else {
              qb.where('tag.genreId IN (:...tagIds)', { tagIds });
            }
          }
        }
      })
    );

    query.andWhere('track.visibility = :visibility', { visibility: TrackVisibility.PUBLIC });
    query.andWhere('track.hidden = false');
    query.leftJoinAndSelect('track.user', 'user');
    if (orderBy === 'popular') {
      return query.orderBy('track.playCount', 'DESC').skip(skip).take(limit).getManyAndCount();
    }
    return query.orderBy('track.createdAt', 'DESC').skip(skip).take(limit).getManyAndCount();
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
    myUserId: string,
    page: number,
    limit: number
  ): Promise<[TrackLikes[], number]> {
    const skip = (page - 1) * limit;

    const [likes, total] = await this.trackLikesRepository
      .createQueryBuilder('like')
      .innerJoinAndSelect('like.track', 'track')
      .innerJoinAndSelect('track.user', 'artist')
      .leftJoinAndSelect('track.likes', 'userlike', 'userlike.user_id = :myUserId', { myUserId })
      .leftJoinAndSelect('track.reposts', 'userrepost', 'userrepost.user_id = :myUserId', {
        myUserId,
      })
      .where('like.userId = :userId', { userId })
      .andWhere('track.visibility != :trackType', { trackType: TrackVisibility.PRIVATE })
      .orderBy('like.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return [
      likes.map((like) => ({
        ...like,
        track: {
          ...like.track,
          isLiked: (like.track.likes?.length ?? 0) > 0,
          isReposted: (like.track.reposts?.length ?? 0) > 0,
        },
      })),
      total,
    ];
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
      savedTrack.tags = await Promise.all(dto.tags.map(async (t) => this.findOrCreateGenre(t)));
    }
    if (dto.genreName || dto.tags?.length) {
      await this.trackRepository.save(savedTrack);
    }
    const completeTrack = await this.findByIdWithRelations(savedTrack.trackId);
    if (dto.visibility === TrackVisibility.PUBLIC) {
      await addDocuments([mapTrack(completeTrack!)]);
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
      relations: ['genre', 'tags', 'user'],
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
      track.tags = tagNames.length
        ? await Promise.all(tagNames.map(async (t) => this.findOrCreateGenre(t)))
        : [];
    }
    if (genreName !== undefined || tagNames !== undefined) {
      await this.trackRepository.save(track);
    }
    if (dto.visibility !== undefined) {
      if (updates.visibility === TrackVisibility.PUBLIC) {
        await updateDocument(mapTrack(track));
      } else if (updates.visibility === TrackVisibility.PRIVATE) {
        await deleteDocument(`track_${trackId}`);
      }
    }

    return track;
  }

  async setTrackProcessing(trackId: string): Promise<void> {
    await this.trackRepository.update(trackId, { trackStatus: TrackStatus.PROCESSING });
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
      trackStatus: In([TrackStatus.FINISHED, TrackStatus.SCHEDULED]),
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
      .where('track.userId = :userId', { userId });

    if (isOwner) {
      // Owner sees finished + their own scheduled tracks
      query.andWhere('track.trackStatus IN (:...statuses)', {
        statuses: [TrackStatus.FINISHED, TrackStatus.SCHEDULED],
      });
    } else {
      query.andWhere('track.trackStatus = :status', { status: TrackStatus.FINISHED });
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
    await deleteDocument(`track_${trackId}`);
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
      .leftJoinAndSelect('track.user', 'user')
      .leftJoinAndSelect('track.genre', 'genre')
      .where('track.trackId IN (:...relatedTrackIds)', { relatedTrackIds })
      .andWhere('track.trackStatus = :status', { status: TrackStatus.FINISHED })
      .getMany();
  }

  async findAllTimeStats(userId: string): Promise<{
    totalPlays: number;
    totalReposts: number;
    totalDownloads: number;
    totalLikes: number;
    totalComments: number;
  }> {
    const { totalDownloads } = await this.downloadedTrackRepository
      .createQueryBuilder('download')
      .innerJoin('download.track', 'track')
      .where('track.userId = :userId', { userId })
      .select('COUNT(DISTINCT(download.userId, download.trackId))', 'totalDownloads')
      .getRawOne();

    console.log('Total Downloads Raw Result:', totalDownloads);

    const { totalPlays, totalReposts, totalLikes, totalComments } = await this.trackRepository
      .createQueryBuilder('track')
      .select('SUM(track.playCount)', 'totalPlays')
      .addSelect('SUM(track.repostsCount)', 'totalReposts')
      .addSelect('SUM(track.likesCount)', 'totalLikes')
      .addSelect('SUM(track.commentsCount)', 'totalComments')
      .where('track.userId = :userId', { userId })
      .getRawOne();

    return {
      totalPlays: Number(totalPlays) ?? 0,
      totalReposts: Number(totalReposts) ?? 0,
      totalDownloads: Number(totalDownloads) ?? 0,
      totalLikes: Number(totalLikes) ?? 0,
      totalComments: Number(totalComments) ?? 0,
    };
  }

  async findByIds(
    ids: string[],
    userId: string
  ): Promise<(Track & { isLiked: boolean; isReposted: boolean })[]> {
    const tracks = await this.trackRepository
      .createQueryBuilder('track')
      .leftJoinAndSelect('track.likes', 'userlike', 'userlike.user_id = :userId', { userId })
      .leftJoinAndSelect('track.reposts', 'userrepost', 'userrepost.user_id = :userId', { userId })
      .leftJoin('track.genre', 'genre')
      .leftJoin('track.user', 'user')
      .where('track.trackId IN (:...ids)', { ids })
      .select([
        'track.trackId',
        'track.title',
        'track.coverImage',
        'track.audioUrl',
        'track.waveformUrl',
        'track.durationSeconds',
        'track.userId',
        'track.createdAt',
        'track.playCount',
        'track.likesCount',
        'track.repostsCount',
        'track.commentsCount',
        'track.blockedRegions',
        'track.hidden',
        'track.visibility',
        'track.mainArtists',
        'genre.genreId',
        'genre.name',
        'user.userId',
        'user.username',
        'user.displayName',
        'user.avatarUrl',
        'user.city',
        'user.country',
        'user.followersCount',
      ])
      .addSelect('userlike.userId')
      .addSelect('userlike.trackId')
      .addSelect('userrepost.userId')
      .addSelect('userrepost.trackId')
      .getMany();

    return tracks.map((track) => ({
      ...track,
      // Optional chaining is vital because if there is no like, the array is undefined or empty
      isLiked: (track.likes?.length ?? 0) > 0,
      isReposted: (track.reposts?.length ?? 0) > 0,
    }));
  }

  async getUserLikedTrackIds(userId: string, trackIds: string[]): Promise<Set<string>> {
    if (!trackIds.length) return new Set();
    const likes = await this.trackLikesRepository.find({
      where: { userId, trackId: In(trackIds) },
      select: ['trackId'],
    });
    return new Set(likes.map((l) => l.trackId));
  }

  async getUserRepostedTrackIds(userId: string, trackIds: string[]): Promise<Set<string>> {
    if (!trackIds.length) return new Set();
    const reposts = await this.trackRepostRepository.find({
      where: { userId, trackId: In(trackIds) },
      select: ['trackId'],
    });
    return new Set(reposts.map((r) => r.trackId));
  }

  async getAllUserTracks(username: string): Promise<Track[]> {
    return this.trackRepository
      .createQueryBuilder('track')
      .innerJoin('track.user', 'user')
      .leftJoinAndSelect('track.user', 'trackUser')
      .where('user.username = :username', { username })
      .andWhere('track.visibility = :visibility', { visibility: TrackVisibility.PUBLIC })
      .andWhere('track.trackStatus = :status', { status: TrackStatus.FINISHED })
      .getMany();
  }

  async getTopTrack(username: string): Promise<Track | null> {
    return this.trackRepository
      .createQueryBuilder('track')
      .innerJoin('track.user', 'user')
      .leftJoinAndSelect('track.user', 'trackUser')
      .where('user.username = :username', { username })
      .andWhere('track.visibility = :visibility', { visibility: TrackVisibility.PUBLIC })
      .andWhere('track.trackStatus = :status', { status: TrackStatus.FINISHED })
      .orderBy('track.playCount', 'DESC')
      .getOne();
  }

  async calculatePopularityScore(trackId: string): Promise<number> {
    const track = await this.trackRepository.findOne({
      where: { trackId },
    });
    if (!track) {
      return 0;
    }
    return (
      track.playCount * 1 + track.likesCount * 3 + track.commentsCount * 2 + track.repostsCount * 5
    );
  }

  async getUserInteractedTrackTags(userId: string): Promise<Genre[]> {
    // Subquery to find track IDs the user has interacted with
    const subQuery = (qb: {
      subQuery: () => {
        (): any;
        new (): any;
        select: {
          (arg0: string): {
            (): any;
            new (): any;
            from: {
              (
                arg0: string,
                arg1: string
              ): {
                (): any;
                new (): any;
                where: {
                  (arg0: string): { (): any; new (): any; getQuery: { (): any; new (): any } };
                  new (): any;
                };
              };
              new (): any;
            };
          };
          new (): any;
        };
      };
    }) => {
      const liked = qb
        .subQuery()
        .select('tl.track_id')
        .from('track_likes', 'tl')
        .where('tl.user_id = :userId')
        .getQuery();
      const reposted = qb
        .subQuery()
        .select('tr.track_id')
        .from('track_reposts', 'tr')
        .where('tr.user_id = :userId')
        .getQuery();
      const played = qb
        .subQuery()
        .select('tp.track_id')
        .from('track_plays', 'tp')
        .where('tp.user_id = :userId')
        .getQuery();
      return `track.track_id IN ${liked} OR track.track_id IN ${reposted} OR track.track_id IN ${played}`;
    };

    // Get genres from ManyToOne
    const mainGenres = await this.genreRepository
      .createQueryBuilder('genre')
      .innerJoin('genre.tracks', 'track')
      .where(subQuery)
      .setParameter('userId', userId)
      .getMany();

    // Get genres from ManyToMany tags
    const tagGenres = await this.genreRepository
      .createQueryBuilder('genre')
      .innerJoin('genre.trackTags', 'track')
      .where(subQuery)
      .setParameter('userId', userId)
      .getMany();

    // Combine and deduplicate
    const allGenres = [...mainGenres, ...tagGenres];
    const unique = allGenres.filter(
      (genre, index, self) => index === self.findIndex((g) => g.genreId === genre.genreId)
    );
    // return unique genres
    return unique;
  }

  async getTopTracksByTagIds(tagIds: string[], userId: string) {
    const tracks = await this.trackRepository
      .createQueryBuilder('track')
      .leftJoinAndSelect('track.genre', 'genre')
      .leftJoinAndSelect('track.user', 'user')
      .leftJoinAndSelect('track.likes', 'like', 'like.userId = :userId', { userId })
      .leftJoinAndSelect('track.reposts', 'repost', 'repost.userId = :userId', { userId })
      .where(
        new Brackets((qb) => {
          // Match tracks whose primary genre is in tagIds OR whose ManyToMany tag is in tagIds
          qb.where('track.genreId IN (:...tagIds)').orWhere(
            'track.trackId IN (SELECT tt.track_id FROM track_tags tt WHERE tt.tag_id IN (:...tagIds))'
          );
        })
      )
      .andWhere('track.visibility = :visibility', { visibility: TrackVisibility.PUBLIC })
      .andWhere('track.trackStatus = :status', { status: TrackStatus.FINISHED })
      .andWhere('track.hidden = false')
      .setParameter('tagIds', tagIds)
      .select([
        'track.trackId',
        'track.title',
        'track.coverImage',
        'track.audioUrl',
        'track.waveformUrl',
        'track.durationSeconds',
        'track.userId',
        'track.playCount',
        'track.likesCount',
        'track.repostsCount',
        'track.commentsCount',
        'track.blockedRegions',
        'track.mainArtists',
        'track.visibility',
        'track.hidden',
        'track.createdAt',
        'genre.genreId',
        'genre.name',
        'user.userId',
        'user.username',
        'user.displayName',
        'user.avatarUrl',
        'user.city',
        'user.country',
        'user.followersCount',
        'like.userId',
        'like.trackId',
        'repost.userId',
        'repost.trackId',
      ])
      .orderBy('track.playCount', 'DESC')
      .take(20)
      .getMany();

    return tracks.map((track) => ({
      ...track,
      isLiked: (track.likes?.length ?? 0) > 0,
      isReposted: (track.reposts?.length ?? 0) > 0,
    }));
  }

  async getUserLastListenedArtistUsernames(userId: string): Promise<string[]> {
    const rows = await this.trackPlayRepository
      .createQueryBuilder('play')
      // 1. Select the username and the most recent play time
      .select('user.username', 'username')
      .addSelect('MAX(play.playedAt)', 'latestPlay')
      .innerJoin('play.track', 'track')
      .innerJoin('track.user', 'user')
      .where('play.userId = :userId', { userId })
      // 2. Group by username to ensure uniqueness
      .groupBy('user.username')
      // 3. Order by that max timestamp
      .orderBy('"latestPlay"', 'DESC')
      .limit(5)
      .getRawMany();

    return rows.map((row) => row.username);
  }

  async getUserRecentlyPlayed(userId: string, limit: number): Promise<Track[]> {
    const recentPlays = await this.trackPlayRepository.find({
      where: { userId },
      order: { playedAt: 'DESC' },
      take: limit,
      relations: ['track', 'track.user', 'track.genre'],
    });
    return recentPlays.map((play) => play.track);
  }

  async findNewReleasedTracks(page: number, limit: number): Promise<[Track[], number]> {
    const skip = (page - 1) * limit;
    const query = this.trackRepository
      .createQueryBuilder('track')
      .leftJoinAndSelect('track.user', 'user')
      .leftJoinAndSelect('track.genre', 'genre')
      .where('track.visibility = :visibility', { visibility: TrackVisibility.PUBLIC })
      .andWhere('track.trackStatus = :status', { status: TrackStatus.FINISHED })
      .andWhere('track.hidden = false')
      .andWhere('track.releaseDate <= :now', { now: new Date() })
      .orderBy('track.createdAt', 'DESC')
      .skip(skip)
      .take(limit);
    return query.getManyAndCount();
  }

  async findUpAndComingArtists(): Promise<
    { username: string; displayName: string; avatarUrl: string; followersCount: number }[]
  > {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const rawResults = await this.trackPlayRepository
      .createQueryBuilder('play')
      .innerJoin('play.track', 'track')
      .innerJoin('track.user', 'user')
      .where('play.playedAt > :oneWeekAgo', { oneWeekAgo })
      .select([
        'user.username AS username',
        'user.displayName AS display_name',
        'user.avatarUrl AS avatar_url',
        'user.followersCount AS followers_count',
      ])
      .addSelect('COUNT(play.trackPlayId)', 'play_count')
      .groupBy('user.userId')
      .addGroupBy('user.username')
      .addGroupBy('user.displayName')
      .addGroupBy('user.avatarUrl')
      .addGroupBy('user.followersCount')
      .orderBy('play_count', 'DESC')
      .limit(10)
      .getRawMany();

    return rawResults.map((result) => ({
      username: result.username,
      displayName: result.display_name,
      avatarUrl: result.avatar_url,
      followersCount: Number(result.followers_count),
    }));
  }

  async findTrendingTracks(): Promise<Track[]> {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const tracks = await this.trackRepository
      .createQueryBuilder('track')
      .leftJoinAndSelect('track.user', 'user')
      .where('track.createdAt > :oneMonthAgo', { oneMonthAgo })
      .andWhere('track.trackStatus = :status', { status: TrackStatus.FINISHED })
      .orderBy('track.playCount', 'DESC')
      .take(5)
      .getMany();

    return tracks;
  }

  async updateTrackCommentSettings(trackId: string, allowComments: boolean, showComments: boolean) {
    await this.trackRepository.update(trackId, {
      allowComments,
      showComments,
    });
  }

  async getDownloadedTracksByUser(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<[Track[], number]> {
    return this.trackRepository
      .createQueryBuilder('track')
      .innerJoin('track.downloads', 'download')
      .leftJoinAndSelect('track.user', 'artist')
      .leftJoinAndSelect('track.genre', 'genre')
      .addSelect('download.downloadedAt')
      .where('download.userId = :userId', { userId })
      .orderBy('download.downloadedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  async findAllTracksWithReportCount(page: number, limit: number, status?: TrackStatus) {
    const qb = this.trackRepository
      .createQueryBuilder('track')
      .addSelect(
        (subQb) =>
          subQb
            .select('COUNT(r.report_id)', 'reportsCount')
            .from('reports', 'r')
            .where('r.target_id = track.track_id')
            .andWhere('r.type = :type', { type: ReportType.TRACK }),
        'reportsCount'
      )
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('track.createdAt', 'DESC');

    if (status) {
      qb.andWhere('track.trackStatus = :status', { status });
    }

    const { entities, raw } = await qb.getRawAndEntities();

    const total = await this.trackRepository.count({
      where: status ? { trackStatus: status } : {},
    });

    const tracks = entities.map((track, index) => ({
      ...track,
      reportsCount: parseInt(raw[index]?.reportsCount ?? '0', 10),
    }));

    return { tracks, total };
  }

  async getTopListeners(userId: string) {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const rawResults = await this.trackPlayRepository
      .createQueryBuilder('play')
      .innerJoin('play.track', 'track')
      .innerJoin('track.user', 'artist')
      .innerJoin('play.user', 'user')
      .select([
        'user.userId AS "userId"',
        'user.username AS "username"',
        'user.displayName AS "displayName"',
        'user.avatarUrl AS "avatarUrl"',
        'user.followersCount AS "followersCount"',
        'COUNT(play.trackPlayId) AS "playCount"',
      ])
      .where('play.playedAt > :oneMonthAgo', { oneMonthAgo })
      .andWhere('artist.userId = :userId', { userId })
      .groupBy('user.userId')
      .addGroupBy('user.username')
      .addGroupBy('user.displayName')
      .addGroupBy('user.avatarUrl')
      .addGroupBy('user.followersCount')
      .orderBy('"playCount"', 'DESC')
      .limit(10)
      .getRawMany();

    return rawResults.map((result) => ({
      userId: result.userId,
      username: result.username,
      displayName: result.displayName,
      avatarUrl: result.avatarUrl,
      followersCount: Number(result.followersCount),
      playCount: Number(result.playCount),
    }));
  }

  async getTopRegions(userId: string) {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const rawResults = await this.trackPlayRepository
      .createQueryBuilder('play')
      .innerJoin('play.track', 'track')
      .innerJoin('track.user', 'artist')
      .innerJoin('play.user', 'user')
      .select(['user.country AS "country"', 'COUNT(play.trackPlayId) AS "playCount"'])
      .where('play.playedAt > :oneMonthAgo', { oneMonthAgo })
      .andWhere('artist.userId = :userId', { userId })
      .andWhere('user.country IS NOT NULL')
      .groupBy('user.country')
      .orderBy('"playCount"', 'DESC')
      .limit(10)
      .getRawMany();

    return rawResults.map((result) => ({
      country: result.country,
      playCount: Number(result.playCount),
    }));
  }

  async getTopPlaylistsAndAlbums(userId: string) {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const rawResults = await this.trackPlayRepository
      .createQueryBuilder('play')
      .innerJoin('play.track', 'track')
      .innerJoin('track.user', 'artist')
      .innerJoin('play.playlist', 'playlist')
      .select([
        'playlist.playlistId AS "playlistId"',
        'playlist.title AS "title"',
        'playlist.coverImage AS "coverImage"',
        'playlist.tracksCount AS "trackCount"',
        'playlist.likesCount AS "likesCount"',
        'playlist.repostsCount AS "repostsCount"',
        'playlist.userId AS "ownerId"',
        'playlist.isPublic AS "isPublic"',
        'playlist.type AS "type"',
        'COUNT(play.trackPlayId) AS "playCount"',
      ])
      .where('play.playedAt > :oneMonthAgo', { oneMonthAgo })
      .andWhere('artist.userId = :userId', { userId })
      .andWhere('playlist.isPublic = true')
      .andWhere('playlist.type != :playlistType ', { playlistType: PlaylistType.STATION })
      .groupBy('playlist.playlistId')
      .addGroupBy('playlist.title')
      .addGroupBy('playlist.coverImage')
      .addGroupBy('playlist.tracksCount')
      .addGroupBy('playlist.likesCount')
      .addGroupBy('playlist.repostsCount')
      .addGroupBy('playlist.userId')
      .addGroupBy('playlist.isPublic')
      .addGroupBy('playlist.type')
      .orderBy('"playCount"', 'DESC')
      .limit(10)
      .getRawMany();

    return rawResults.map((result) => ({
      playlistId: result.playlistId,
      title: result.title,
      coverImage: result.coverImage,
      trackCount: Number(result.trackCount),
      likesCount: Number(result.likesCount),
      repostsCount: Number(result.repostsCount),
      ownerId: result.ownerId,
      type: result.type,
      playCount: Number(result.playCount),
    }));
  }

  async setScheduledAt(trackId: string, scheduledAt: Date): Promise<void> {
    await this.trackRepository.update(trackId, { scheduledAt });
  }

  async scheduleTrackRelease(
    trackId: string,
    scheduledAt: Date,
    removeFromSearch = true
  ): Promise<void> {
    await this.trackRepository.update(trackId, {
      scheduledAt,
      trackStatus: TrackStatus.SCHEDULED,
    });
    if (removeFromSearch) {
      await deleteDocument(`track_${trackId}`);
    }
  }

  async releaseTrack(trackId: string): Promise<Track | null> {
    await this.trackRepository.update(trackId, {
      trackStatus: TrackStatus.FINISHED,
      scheduledAt: null,
    });
    const track = await this.findByIdWithRelations(trackId);
    if (track && track.visibility === TrackVisibility.PUBLIC) {
      await addDocuments([mapTrack(track)]);
    }
    return track;
  }

  async getSpotlightTracks(userId: string) {
    const spotlights = await this.spotlightTracksRepository.find({
      where: { userId },
      relations: ['track', 'track.genre', 'track.tags'],
    });

    return spotlights.map((s) => s.track);
  }

  async countSpotlight(userId: string) {
    return this.spotlightTracksRepository.count({ where: { userId } });
  }

  async findSpotlight(userId: string, trackId: string) {
    return this.spotlightTracksRepository.findOne({
      where: { userId, trackId },
    });
  }

  async addToSpotlight(userId: string, trackId: string) {
    const spotlight = this.spotlightTracksRepository.create({ userId, trackId });
    return this.spotlightTracksRepository.save(spotlight);
  }

  async updateSpotlightTracks(userId: string, trackIds: string[]): Promise<void> {
    await this.spotlightTracksRepository.delete({ userId });

    if (trackIds.length === 0) return;

    const spotlights = trackIds.map((trackId) =>
      this.spotlightTracksRepository.create({ userId, trackId })
    );

    await this.spotlightTracksRepository.save(spotlights);
  }
}
