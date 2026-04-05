import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PlaylistRepository } from './playlist.repository';
import { buildPaginationResponse } from '../common/utilities/pagination.util';
import { UserRepository } from '../user/user.repository';
import { Playlist } from './entities/playlist.entity';

@Injectable()
export class PlaylistService {
  constructor(
    private readonly playlistRepository: PlaylistRepository,
    private readonly userRepository: UserRepository
  ) {}

  async getPlaylistById(playlistId: string): Promise<Playlist | null> {
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    return playlist;
  }

  async repostPlaylist(playlistId: string, userId: string) {
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (!playlist.isPublic) {
      throw new ForbiddenException('Cannot repost a private playlist');
    }

    if (playlist.userId === userId) {
      throw new BadRequestException('You cannot repost your own playlist');
    }

    const alreadyReposted = await this.playlistRepository.findRepostByUserAndPlaylist(
      userId,
      playlistId
    );
    if (alreadyReposted) {
      throw new ConflictException('You have already reposted this playlist');
    }

    await this.playlistRepository.createRepost(userId, playlistId);
    return {
      status: 'success',
      data: { userId, playlistId, repostedAt: new Date() },
    };
  }

  async removeRepost(playlistId: string, userId: string) {
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    const isReposted = await this.playlistRepository.findRepostByUserAndPlaylist(
      userId,
      playlistId
    );
    if (!isReposted) {
      throw new ForbiddenException('You have not reposted this playlist');
    }

    await this.playlistRepository.removeRepost(userId, playlistId);
    return {
      status: 'success',
      message: 'Playlist repost successfully removed',
    };
  }

  async getRepostsCount(playlistId: string) {
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (!playlist.isPublic) {
      throw new ForbiddenException('This playlist is private');
    }

    return {
      status: 'success',
      data: { playlistId, repostCount: playlist.repostsCount },
    };
  }

  async getPlaylistReposters(
    playlistId: string,
    userId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (!playlist.isPublic && playlist.userId !== userId) {
      throw new ForbiddenException('This playlist is private');
    }

    const cappedLimit = Math.min(limit, 100);
    const [reposts, total] = await this.playlistRepository.getPlaylistReposters(
      playlistId,
      page,
      cappedLimit
    );

    const mappedReposters = reposts.map((repost) => ({
      userId: repost.user.userId,
      username: repost.user.username,
      displayName: repost.user.displayName,
      avatarUrl: repost.user.avatarUrl,
      repostedAt: repost.createdAt,
    }));

    return { status: 'success', ...buildPaginationResponse(mappedReposters, total, page, limit) };
  }

  async getUserPlaylistReposts(
    userId: string,
    myUserId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isPublic && user.userId !== myUserId) {
      throw new ForbiddenException('This account is private');
    }

    const cappedLimit = Math.min(limit, 100);
    const [reposts, total] = await this.playlistRepository.getUserPlaylistReposts(
      userId,
      page,
      cappedLimit
    );

    const mappedReposts = reposts.map((repost) => ({
      playlistId: repost.playlistId,
      title: repost.playlist.title,
      coverImage: repost.playlist.coverImage,
      isPublic: repost.playlist.isPublic,
      tracksCount: repost.playlist.tracksCount,
      likesCount: repost.playlist.likesCount,
      repostsCount: repost.playlist.repostsCount,
      user: {
        userId: repost.playlist.user.userId,
        username: repost.playlist.user.username,
        displayName: repost.playlist.user.displayName,
      },
      repostedAt: repost.createdAt,
    }));

    return { status: 'success', ...buildPaginationResponse(mappedReposts, total, page, limit) };
  }

  async likePlaylist(playlistId: string, userId: string) {
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (!playlist.isPublic && playlist.userId !== userId) {
      throw new ForbiddenException('Cannot like a private playlist');
    }

    const alreadyLiked = await this.playlistRepository.findLikeByUserAndPlaylist(
      userId,
      playlistId
    );
    if (alreadyLiked) {
      throw new ConflictException('You have already liked this playlist');
    }

    await this.playlistRepository.createLike(userId, playlistId);
    return {
      status: 'success',
      data: { userId, playlistId, likedAt: new Date() },
    };
  }

  async unlikePlaylist(playlistId: string, userId: string) {
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    const isLiked = await this.playlistRepository.findLikeByUserAndPlaylist(userId, playlistId);
    if (!isLiked) {
      throw new ForbiddenException('You have not liked this playlist');
    }

    await this.playlistRepository.removeLike(userId, playlistId);
    return {
      status: 'success',
      message: 'Playlist like successfully removed',
    };
  }

  async getLikesCount(playlistId: string, userId: string) {
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (!playlist.isPublic && playlist.userId !== userId) {
      throw new ForbiddenException('This playlist is private');
    }

    return {
      status: 'success',
      data: { playlistId, likesCount: playlist.likesCount },
    };
  }

  async getPlaylistLikes(playlistId: string, userId: string, page: number = 1, limit: number = 20) {
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (!playlist.isPublic && playlist.userId !== userId) {
      throw new ForbiddenException('This playlist is private');
    }

    const cappedLimit = Math.min(limit, 100);
    const [likes, total] = await this.playlistRepository.getPlaylistLikes(
      playlistId,
      page,
      cappedLimit
    );

    const mappedLikes = likes.map((like) => ({
      userId: like.user.userId,
      username: like.user.username,
      displayName: like.user.displayName,
      avatarUrl: like.user.avatarUrl,
      followersCount: like.user.followersCount,
      likedAt: like.createdAt,
    }));

    return { status: 'success', ...buildPaginationResponse(mappedLikes, total, page, limit) };
  }

  async getUserPlaylistLikes(
    userId: string,
    myUserId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isPublic && user.userId !== myUserId) {
      throw new ForbiddenException('This account is private');
    }

    const cappedLimit = Math.min(limit, 100);
    const [likes, total] = await this.playlistRepository.getUserPlaylistLikes(
      userId,
      page,
      cappedLimit
    );

    const mappedLikes = likes.map((like) => ({
      playlistId: like.playlistId,
      title: like.playlist.title,
      coverImage: like.playlist.coverImage,
      isPublic: like.playlist.isPublic,
      tracksCount: like.playlist.tracksCount,
      likesCount: like.playlist.likesCount,
      repostsCount: like.playlist.repostsCount,
      user: {
        userId: like.playlist.user.userId,
        username: like.playlist.user.username,
        displayName: like.playlist.user.displayName,
      },
      likedAt: like.createdAt,
    }));

    return { status: 'success', ...buildPaginationResponse(mappedLikes, total, page, limit) };
  }
}
