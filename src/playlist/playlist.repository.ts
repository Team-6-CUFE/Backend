import { Injectable } from '@nestjs/common';
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
    private readonly playlistTrackRepository: Repository<PlaylistTrack>,
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
      coverImage: createPlaylistDto.coverimage,
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
    return this.trackRepository.findOne({ where: { trackId } as any });
  }

  async countTracksInPlaylist(playlistId: string): Promise<number> {
    return this.playlistTrackRepository.count({ where: { playlistId } });
  }

  async addTrackToPlaylist(playlistId: string, trackId: string, position: number) {
    const newEntry = this.playlistTrackRepository.create({
      playlistId,
      trackId,
      position,
    });
    return this.playlistTrackRepository.save(newEntry);
  }

  async updatePlaylistStats(playlistId: string, tracksCount: number, durationDelta: number) {
    await this.playlistRepository.increment({ playlistId }, 'totalDurationSeconds', durationDelta);
    await this.playlistRepository.update({ playlistId }, { tracksCount });
  }
}
