import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Playlist } from './entities/playlist.entity';
import { PlaylistRepost } from './entities/playlist-reposts.entity';
import { PlaylistLike } from './entities/playlist-likes.entity';

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
    console.log('page', page);
    console.log('limit', limit);
    const skip = (page - 1) * limit;
    console.log(skip);
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
}
