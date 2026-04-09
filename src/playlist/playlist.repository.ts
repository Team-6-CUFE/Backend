import { ConflictException, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Playlist } from './entities/playlist.entity';
import { PlaylistRepost } from './entities/playlist-reposts.entity';
import { PlaylistLike } from './entities/playlist-likes.entity';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { generateVerificationToken } from '../common/utilities/tokens.util';
import { PlaylistTrack } from './entities/playlist-tracks.entity';
import { Track } from '../track/entities/track.entity';

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
    private readonly trackRepository: Repository<Track>
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

    return this.playlistRepository.save(playlist);
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
}
