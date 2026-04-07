import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Playlist } from './entities/playlist.entity';
import { PlaylistRepost } from './entities/playlist-reposts.entity';
import { PlaylistLike } from './entities/playlist-likes.entity';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { generateVerificationToken } from '../common/utilities/tokens.util';

@Injectable()
export class PlaylistRepository {
  constructor(
    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,
    @InjectRepository(PlaylistRepost)
    private readonly playlistRepostRepository: Repository<PlaylistRepost>,
    @InjectRepository(PlaylistLike)
    private readonly playlistLikesRepository: Repository<PlaylistLike>
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

  async getPublicPlaylist(playlistId: string): Promise<Playlist | null> {
    return this.playlistRepository.findOne({
      where: {
        playlistId,
        isPublic: true,
      },
      relations: ['user', 'playlistTracks', 'playlistTracks.track'],
      order: {
        playlistTracks: {
          position: 'ASC',
        },
      },
    });
  }

  async getSecretPlaylist(secretToken: string): Promise<Playlist | null> {
    return this.playlistRepository.findOne({
      where: {
        secretToken,
        isPublic: false,
      },
      relations: ['user', 'playlistTracks', 'playlistTracks.track'],
      order: {
        playlistTracks: {
          position: 'ASC',
        },
      },
    });
  }

  async resetSecretToken(playlistId: string): Promise<string | null> {
    const newToken = generateVerificationToken();
    await this.playlistRepository.update(
      { playlistId }, // where condition
      { secretToken: newToken } // what to update
    );
    return newToken;
  }

  async changePlaylistPrivacy(playlistId: string, isPublic: boolean): Promise<string | null> {
    if (!isPublic) {
      const newToken = generateVerificationToken();
      await this.playlistRepository.update(
        { playlistId },
        { secretToken: newToken, isPublic: false }
      );
      return newToken;
    }
    await this.playlistRepository.update({ playlistId }, { secretToken: null, isPublic: true });
    return playlistId;
  }
}
