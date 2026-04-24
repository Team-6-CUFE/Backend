import { ConflictException, Injectable } from '@nestjs/common';
import { In, IsNull, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Playlist, PlaylistType } from './entities/playlist.entity';
import { PlaylistRepost } from './entities/playlist-reposts.entity';
import { PlaylistLike } from './entities/playlist-likes.entity';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { generateVerificationToken } from '../common/utilities/tokens.util';
import { PlaylistTrack } from './entities/playlist-tracks.entity';
import { Track } from '../track/entities/track.entity';
import { Genre } from '../genre/entities/genre.entity';
import { mapPlaylist, addDocuments, deleteDocument } from '../search/indexing';

@Injectable()
export class PlaylistRepository {
  constructor(
    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,
    @InjectRepository(PlaylistRepost)
    private readonly playlistRepostRepository: Repository<PlaylistRepost>,
    @InjectRepository(PlaylistLike)
    private readonly playlistLikesRepository: Repository<PlaylistLike>,
    @InjectRepository(PlaylistTrack)
    private readonly playlistTrackRepository: Repository<PlaylistTrack>, // Use Repository here
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>
  ) {}

  async findPlaylistById(playlistId: string): Promise<Playlist | null> {
    return this.playlistRepository.findOne({ where: { playlistId } });
  }

  async findRepostByUserAndPlaylist(
    userId: string,
    playlistId: string
  ): Promise<PlaylistRepost | null> {
    return this.playlistRepostRepository.findOne({
      where: { userId, playlistId },
    });
  }

  async createRepost(userId: string, playlistId: string): Promise<PlaylistRepost> {
    const repost = this.playlistRepostRepository.create({
      userId,
      playlistId,
    });
    return this.playlistRepostRepository.save(repost);
  }

  async removeRepost(userId: string, playlistId: string) {
    await this.playlistRepostRepository.delete({ userId, playlistId });
  }

  async getPlaylistReposters(
    playlistId: string,
    page: number,
    cappedLimit: number
  ): Promise<[any[], number]> {
    const skip = (page - 1) * cappedLimit;
    const [reposts, total] = await this.playlistRepostRepository.findAndCount({
      where: { playlistId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take: cappedLimit,
    });
    return [reposts, total];
  }

  async getUserPlaylistReposts(
    userId: string,
    page: number,
    limit: number
  ): Promise<[any[], number]> {
    const skip = (page - 1) * limit;
    return this.playlistRepostRepository
      .createQueryBuilder('repost')
      .innerJoinAndSelect('repost.playlist', 'playlist')
      .innerJoinAndSelect('playlist.user', 'user')
      .where('repost.userId = :userId', { userId })
      .orderBy('repost.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
  }

  async findLikeByUserAndPlaylist(
    userId: string,
    playlistId: string
  ): Promise<PlaylistRepost | null> {
    return this.playlistLikesRepository.findOne({
      where: { userId, playlistId },
    });
  }

  async createLike(userId: string, playlistId: string): Promise<PlaylistRepost> {
    const like = this.playlistLikesRepository.create({
      userId,
      playlistId,
    });
    return this.playlistLikesRepository.save(like);
  }

  async removeLike(userId: string, playlistId: string) {
    await this.playlistLikesRepository.delete({ userId, playlistId });
  }

  async getPlaylistLikes(
    playlistId: string,
    page: number,
    cappedLimit: number
  ): Promise<[any[], number]> {
    const skip = (page - 1) * cappedLimit;
    const [reposts, total] = await this.playlistLikesRepository.findAndCount({
      where: { playlistId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take: cappedLimit,
    });
    return [reposts, total];
  }

  async getUserPlaylistLikes(
    userId: string,
    page: number,
    limit: number
  ): Promise<[any[], number]> {
    const skip = (page - 1) * limit;
    return this.playlistLikesRepository
      .createQueryBuilder('like')
      .innerJoinAndSelect('like.playlist', 'playlist')
      .innerJoinAndSelect('playlist.user', 'user')
      .where('like.userId = :userId', { userId })
      .orderBy('like.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
  }

  async createPlaylist(createPlaylistDto: CreatePlaylistDto, userId: string) {
    let secretToken = null;
    if (createPlaylistDto.isPublic === false) {
      secretToken = generateVerificationToken();
    }

    const playlist = this.playlistRepository.create({
      title: createPlaylistDto.title,
      description: createPlaylistDto.description,
      coverImage: createPlaylistDto.coverImage,
      isPublic: createPlaylistDto.isPublic,
      likesCount: 0,
      repostsCount: 0,
      totalDurationSeconds: 0,
      userId,
      tracksCount: 0,
      secretToken,
    });

    const savedPlaylist = await this.playlistRepository.save(playlist);
    const completePlaylist = await this.getPlaylistDetails(savedPlaylist.playlistId);
    await addDocuments([mapPlaylist(completePlaylist!)]);
    return savedPlaylist;
  }

  async transferStationLikes(oldPlaylistId: string, newPlaylistId: string): Promise<void> {
    // transfer like relations to new station
    await this.playlistLikesRepository.manager.transaction(async (tm) => {
      const existingLikes = await tm.find(PlaylistLike, { where: { playlistId: oldPlaylistId } });
      const newLikes = existingLikes.map((like) => {
        const newLike = tm.create(PlaylistLike, {
          userId: like.userId,
          playlistId: newPlaylistId,
        });
        return newLike;
      });
      await tm.save(newLikes);
    });
  }

  async updatePlaylist(
    playlistId: string,
    updateData: Partial<Playlist>
  ): Promise<Playlist | null> {
    await this.playlistRepository.update({ playlistId }, updateData);
    return this.findPlaylistById(playlistId);
  }

  async findTrackById(trackId: string): Promise<Track | null> {
    return this.trackRepository.findOne({
      where: { trackId },
      select: ['trackId', 'durationSeconds'],
    });
  }

  async updatePlaylistStats(playlistId: string, durationDelta: number): Promise<Playlist | null> {
    await this.playlistRepository.increment({ playlistId }, 'tracksCount', 1);
    await this.playlistRepository.increment({ playlistId }, 'totalDurationSeconds', durationDelta);

    return this.findPlaylistById(playlistId);
  }

  async addTrackToPlaylist(playlistId: string, trackId: string, position: number) {
    const existing = await this.playlistTrackRepository.findOne({
      where: { playlistId, trackId },
    });

    if (existing) {
      throw new ConflictException('Track is already in the playlist');
    }

    const newEntry = this.playlistTrackRepository.create({
      playlistId,
      trackId,
      position,
    });

    return this.playlistTrackRepository.save(newEntry);
  }

  async findMaxPosition(playlistId: string): Promise<number> {
    const result = await this.playlistTrackRepository
      .createQueryBuilder('pt')
      .select('MAX(pt.position)', 'max')
      .where('pt.playlistId = :playlistId', { playlistId })
      .getRawOne();

    return result?.max ? parseInt(result.max, 10) : 0;
  }

  async findTrackInPlaylist(playlistId: string, trackId: string): Promise<PlaylistTrack | null> {
    return this.playlistTrackRepository.findOne({
      where: { playlistId, trackId },
    });
  }

  async removeTrackAndReorder(playlistId: string, trackId: string, position: number) {
    return this.playlistTrackRepository.manager.transaction(async (tm) => {
      await tm.delete(PlaylistTrack, { playlistId, trackId });

      await tm
        .createQueryBuilder()
        .update(PlaylistTrack)
        .set({ position: () => '"position" - 1' })
        .where('playlistId = :playlistId AND position > :position', { playlistId, position })
        .execute();
    });
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    const playlist = await this.findPlaylistById(playlistId);
    if (playlist?.type === PlaylistType.PLAYLIST) {
      await deleteDocument(`playlist_${playlistId}`);
    } else if (playlist?.type !== PlaylistType.STATION) {
      await deleteDocument(`album_${playlistId}`);
    }
    await this.playlistRepository.delete({ playlistId });
  }

  async getPlaylistDetails(playlistId: string): Promise<Playlist | null> {
    return this.playlistRepository.findOne({
      where: { playlistId },
      relations: ['user', 'playlistTracks', 'playlistTracks.track'],
      order: {
        playlistTracks: {
          position: 'ASC',
        },
      },
    });
  }

  async reorderTracks(playlistId: string, trackIds: string[]): Promise<void> {
    await this.playlistTrackRepository.manager.transaction(async (tm) => {
      const updatePromises = trackIds.map((trackId, index) =>
        tm.update(PlaylistTrack, { playlistId, trackId }, { position: index + 1 })
      );

      await Promise.all(updatePromises);
    });
  }

  async findAllTrackIdsInPlaylist(playlistId: string): Promise<string[]> {
    const relations = await this.playlistTrackRepository.find({
      where: { playlistId },
      select: ['trackId'],
    });
    return relations.map((r) => r.trackId);
  }

  async getTrackPlaylists(
    trackId: string,
    requesterId: string,
    page: number,
    limit: number
  ): Promise<[any[], number]> {
    const skip = (page - 1) * limit;

    return this.playlistTrackRepository
      .createQueryBuilder('pt')
      .innerJoinAndSelect('pt.playlist', 'playlist')
      .innerJoinAndSelect('playlist.user', 'user')
      .where('pt.trackId = :trackId', { trackId })
      .andWhere('(playlist.isPublic = true OR playlist.userId = :requesterId)', { requesterId })
      .orderBy('pt.addedAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
  }

  async changePlaylistPrivacy(playlistId: string, isPublic: boolean): Promise<string | null> {
    if (!isPublic) {
      const token = generateVerificationToken();
      await this.playlistRepository.update({ playlistId }, { secretToken: token, isPublic: false });
      return token;
    }

    await this.playlistRepository.update({ playlistId }, { secretToken: null, isPublic: true });

    return playlistId;
  }

  async getPublicPlaylist(playlistId: string): Promise<Playlist | null> {
    return this.playlistRepository.findOne({
      where: {
        playlistId,
      },
      relations: [
        'user',
        'playlistTracks',
        'playlistTracks.track',
        'playlistTracks.track.user',
        'tags',
        'genre',
      ],
      order: {
        playlistTracks: { position: 'ASC' },
      },
    });
  }

  async getTrackStation(trackId: string): Promise<Playlist | null> {
    return this.playlistRepository.findOne({
      where: { trackId, type: PlaylistType.STATION },
      relations: [
        'user',
        'playlistTracks',
        'playlistTracks.track',
        'playlistTracks.track.user',
        'tags',
      ],
      order: {
        playlistTracks: { position: 'ASC' },
      },
    });
  }

  async getArtistStation(userId: string): Promise<Playlist | null> {
    return this.playlistRepository.findOne({
      where: { userId, type: PlaylistType.STATION, trackId: IsNull() },
      relations: [
        'user',
        'playlistTracks',
        'playlistTracks.track',
        'playlistTracks.track.user',
        'tags',
      ],
      order: {
        playlistTracks: { position: 'ASC' },
      },
    });
  }

  async createTrackStation(
    trackId: string,
    trackTitle: string,
    trackImage: string,
    userId: string
  ): Promise<Playlist> {
    const station = this.playlistRepository.create({
      title: trackTitle,
      description: `Based on ${trackTitle}`,
      userId,
      isPublic: true,
      type: PlaylistType.STATION,
      trackId,
      coverImage: trackImage,
    });
    return this.playlistRepository.save(station);
  }

  async createArtistStation(
    displayName: string,
    artist_avatar: string,
    userId: string
  ): Promise<Playlist> {
    const station = this.playlistRepository.create({
      title: displayName,
      description: `Based on ${displayName}`,
      userId,
      isPublic: true,
      type: PlaylistType.STATION,
      coverImage: artist_avatar,
    });
    return this.playlistRepository.save(station);
  }

  async getSecretPlaylist(secretToken: string): Promise<Playlist | null> {
    return this.playlistRepository.findOne({
      where: { secretToken, isPublic: false },
      relations: [
        'user',
        'playlistTracks',
        'playlistTracks.track',
        'playlistTracks.track.user',
        'tags',
        'genre',
      ],
      order: { playlistTracks: { position: 'ASC' } },
    });
  }

  async resetSecretToken(playlistId: string): Promise<string> {
    const newToken = generateVerificationToken();
    await this.playlistRepository.update({ playlistId }, { secretToken: newToken });
    return newToken;
  }

  async getPlaylistWithTagsandGenre(playlistId: string): Promise<Playlist | null> {
    return this.playlistRepository.findOne({
      where: { playlistId },
      relations: ['tags', 'genre', 'user'],
    });
  }

  async updatePlaylistTags(playlistId: string, tags: Genre[]): Promise<void> {
    const playlist = await this.playlistRepository.findOne({
      where: { playlistId },
      relations: ['tags'],
    });
    if (!playlist) return;
    playlist.tags = tags;
    await this.playlistRepository.save(playlist);
  }

  async findOrCreateGenre(names: string): Promise<Genre> {
    const trimmed = names.trim();
    const existing = await this.genreRepository.findBy({ name: In([trimmed]) });
    if (existing.length) {
      return existing[0];
    }
    return this.genreRepository.save(this.genreRepository.create({ name: trimmed }));
  }

  async updatePlaylistGenre(playlistId: string, genre: Genre | null): Promise<void> {
    await this.playlistRepository.update({ playlistId }, { genreId: genre ? genre.genreId : null });
  }

  async getMyPlaylists(userId: string, page: number, limit: number): Promise<[Playlist[], number]> {
    const skip = (page - 1) * limit;

    return this.playlistRepository
      .createQueryBuilder('playlist')
      .leftJoinAndSelect('playlist.user', 'user')
      .where('playlist.userId = :userId', { userId })
      .orWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('like.playlistId')
          .from(PlaylistLike, 'like')
          .where('like.userId = :userId')
          .getQuery();
        return `playlist.playlistId IN ${subQuery}`;
      })
      .orderBy('playlist.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
  }

  async getUserPlaylists(
    userId: string,
    page: number,
    limit: number
  ): Promise<[Playlist[], number]> {
    const skip = (page - 1) * limit;

    return this.playlistRepository
      .createQueryBuilder('playlist')
      .leftJoinAndSelect('playlist.user', 'user')
      .where('playlist.isPublic = :isPublic', { isPublic: true })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('like.playlistId')
          .from(PlaylistLike, 'like')
          .where('like.userId = :userId')
          .getQuery();
        return `(playlist.userId = :userId OR playlist.playlistId IN ${subQuery})`;
      })
      .setParameter('userId', userId)
      .orderBy('playlist.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
  }

  async findByIds(ids: string[]): Promise<Playlist[]> {
    return this.playlistRepository
      .createQueryBuilder('playlist')
      .where('playlist.playlistId IN (:...ids)', { ids })
      .leftJoin('playlist.genre', 'genre')
      .leftJoin('playlist.user', 'playlistUser')
      .leftJoinAndSelect('playlist.playlistTracks', 'playlistTrack')
      .leftJoinAndSelect('playlistTrack.track', 'track')
      .leftJoin('track.user', 'trackUser')
      .orderBy('playlistTrack.position', 'ASC')
      .select([
        'playlist.playlistId',
        'playlist.title',
        'playlist.description',
        'playlist.coverImage',
        'playlist.totalDurationSeconds',
        'playlist.tracksCount',
        'playlist.likesCount',
        'playlist.repostsCount',
        'playlist.userId',
        'playlist.type',
        'playlist.createdAt',
        'genre.genreId',
        'genre.name',
        'playlistUser.userId',
        'playlistUser.username',
        'playlistUser.displayName',
        'playlistUser.avatarUrl',
        'playlistUser.city',
        'playlistUser.country',
        'playlistUser.followersCount',
        'playlistTrack.position',
        'playlistTrack.trackId',
        'track.trackId',
        'track.title',
        'track.audioUrl',
        'track.waveformUrl',
        'track.coverImage',
        'track.durationSeconds',
        'track.playCount',
        'track.likesCount',
        'track.repostsCount',
        'track.commentsCount',
        'track.blockedRegions',
        'track.hidden',
        'track.visibility',
        'track.userId',
        'trackUser.userId',
        'trackUser.username',
        'trackUser.displayName',
        'trackUser.avatarUrl',
        'trackUser.city',
        'trackUser.country',
        'trackUser.followersCount',
      ])
      .getMany();
  }

  async findPlaylistsByIds(ids: string[]): Promise<Playlist[]> {
    return this.playlistRepository
      .createQueryBuilder('playlist')
      .where('playlist.playlistId IN (:...ids)', { ids })
      .andWhere('playlist.type = :type', { type: PlaylistType.PLAYLIST })
      .leftJoin('playlist.genre', 'genre')
      .leftJoin('playlist.user', 'playlistUser')
      .leftJoinAndSelect('playlist.playlistTracks', 'playlistTrack')
      .leftJoinAndSelect('playlistTrack.track', 'track')
      .leftJoin('track.user', 'trackUser')
      .orderBy('playlistTrack.position', 'ASC')
      .select([
        'playlist.playlistId',
        'playlist.title',
        'playlist.description',
        'playlist.coverImage',
        'playlist.totalDurationSeconds',
        'playlist.tracksCount',
        'playlist.likesCount',
        'playlist.repostsCount',
        'playlist.userId',
        'playlist.type',
        'playlist.createdAt',
        'genre.genreId',
        'genre.name',
        'playlistUser.userId',
        'playlistUser.username',
        'playlistUser.displayName',
        'playlistUser.avatarUrl',
        'playlistUser.city',
        'playlistUser.country',
        'playlistUser.followersCount',
        'playlistTrack.position',
        'playlistTrack.trackId',
        'track.trackId',
        'track.title',
        'track.audioUrl',
        'track.waveformUrl',
        'track.coverImage',
        'track.durationSeconds',
        'track.playCount',
        'track.likesCount',
        'track.repostsCount',
        'track.commentsCount',
        'track.blockedRegions',
        'track.hidden',
        'track.visibility',
        'track.userId',
        'trackUser.userId',
        'trackUser.username',
        'trackUser.displayName',
        'trackUser.avatarUrl',
        'trackUser.city',
        'trackUser.country',
        'trackUser.followersCount',
      ])
      .getMany();
  }

  async findAlbumsByIds(ids: string[]): Promise<Playlist[]> {
    return this.playlistRepository
      .createQueryBuilder('playlist')
      .where('playlist.playlistId IN (:...ids)', { ids })
      .andWhere('playlist.type != :type', { type: PlaylistType.PLAYLIST })
      .andWhere('playlist.type != :stationType', { stationType: PlaylistType.STATION })
      .leftJoin('playlist.genre', 'genre')
      .leftJoin('playlist.user', 'playlistUser')
      .leftJoinAndSelect('playlist.playlistTracks', 'playlistTrack')
      .leftJoinAndSelect('playlistTrack.track', 'track')
      .leftJoin('track.user', 'trackUser')
      .orderBy('playlistTrack.position', 'ASC')
      .select([
        'playlist.playlistId',
        'playlist.title',
        'playlist.description',
        'playlist.coverImage',
        'playlist.totalDurationSeconds',
        'playlist.tracksCount',
        'playlist.likesCount',
        'playlist.repostsCount',
        'playlist.userId',
        'playlist.type',
        'playlist.createdAt',
        'genre.genreId',
        'genre.name',
        'playlistUser.userId',
        'playlistUser.username',
        'playlistUser.displayName',
        'playlistUser.avatarUrl',
        'playlistUser.city',
        'playlistUser.country',
        'playlistUser.followersCount',
        'playlistTrack.position',
        'playlistTrack.trackId',
        'track.trackId',
        'track.title',
        'track.audioUrl',
        'track.waveformUrl',
        'track.coverImage',
        'track.durationSeconds',
        'track.playCount',
        'track.likesCount',
        'track.repostsCount',
        'track.commentsCount',
        'track.blockedRegions',
        'track.hidden',
        'track.visibility',
        'track.userId',
        'trackUser.userId',
        'trackUser.username',
        'trackUser.displayName',
        'trackUser.avatarUrl',
        'trackUser.city',
        'trackUser.country',
        'trackUser.followersCount',
      ])
      .getMany();
  }

  async getUserLikedPlaylistIds(userId: string, playlistIds: string[]): Promise<Set<string>> {
    if (!playlistIds.length) return new Set();
    const likes = await this.playlistLikesRepository.find({
      where: { userId, playlistId: In(playlistIds) },
      select: ['playlistId'],
    });
    return new Set(likes.map((l) => l.playlistId));
  }

  async getUserRepostedPlaylistIds(userId: string, playlistIds: string[]): Promise<Set<string>> {
    if (!playlistIds.length) return new Set();
    const reposts = await this.playlistRepostRepository.find({
      where: { userId, playlistId: In(playlistIds) },
      select: ['playlistId'],
    });
    return new Set(reposts.map((r) => r.playlistId));
  }

  async clearPlaylistTracks(playlistId: string): Promise<void> {
    await this.playlistTrackRepository.delete({ playlistId });
    await this.playlistRepository.update(
      { playlistId },
      { tracksCount: 0, totalDurationSeconds: 0 }
    );
  }

  async getPlaylistByUserAndTitle(userId: string, title: string): Promise<Playlist | null> {
    return this.playlistRepository.findOne({
      where: { userId, title },
    });
  }

  async getPlaylistByUserAndTitles(userId: string, titles: string[]): Promise<Playlist[]> {
    return this.playlistRepository.find({
      where: { userId, title: In(titles) },
    });
  }
}
