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

@Injectable()
export class PlaylistService {
  constructor(
    private readonly playlistRepository: PlaylistRepository,
    private readonly userRepository: UserRepository
  ) {}

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
  /// \\\///\\\///\\\///\\\///\\\///\\\///\\\

  async likePlaylist(playlistId: string, userId: string) {
    // we need to check if playlist exists
    // we need to check if user has already reposted the playlist
    // if not, we create a new repost entry in the database
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    if (!playlist) {
      throw new BadRequestException({ message: 'playlist not found' });
    }
    // check if already like //
    const alreadyLiked = await this.playlistRepository.findLikeByUserAndPlaylist(
      userId,
      playlistId
    );
    if (alreadyLiked) {
      throw new ConflictException({
        message: 'You have already liked this playlist',
      });
    }
    // check if playlist is private//
    const isPrivate = playlist.isPublic;
    if (!isPrivate && playlist.userId !== userId) {
      throw new ForbiddenException({
        message: 'Cannot like a private playlist',
      });
    }
    await this.playlistRepository.createLike(userId, playlistId);
    return {
      status: 'success',
      userId,
      playlistId,
      likedAt: new Date(),
    };
  }

  // this function removes a user's repost
  async unlikePlaylist(playlistId: string, userId: string) {
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    if (!playlist) {
      throw new BadRequestException({ message: 'playlist not found' });
    }
    // check if user reposted this playlist or not
    const isLiked = await this.playlistRepository.findLikeByUserAndPlaylist(userId, playlistId);
    if (!isLiked) {
      throw new ForbiddenException({
        message: 'you have not liked this playlist',
      });
    }
    const { isPublic } = playlist;
    if (!isPublic && playlist.userId !== userId) {
      throw new ForbiddenException({ message: 'This Playlist is Private' });
    }
    await this.playlistRepository.removeLike(userId, playlistId);
    return {
      status: 'success',
      message: 'Playlist Like successfully removed',
    };
  }

  async getLikesCount(playlistId: string, userId: string) {
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    if (!playlist) {
      throw new BadRequestException({ message: 'playlist not found' });
    }
    const { isPublic } = playlist;
    if (!isPublic && playlist.userId !== userId) {
      throw new ForbiddenException({ message: 'This Playlist is Private' });
    }
    const { likesCount } = playlist;
    return {
      playlistId,
      likesCount,
    };
  }

  async getPlaylistLikes(playlistId: string, userId: string, page: number, limit: number) {
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    if (!playlist) {
      throw new BadRequestException({ status: 'error', message: 'playlist not found' });
    }
    if (!playlist.isPublic && playlist.userId !== userId) {
      throw new ForbiddenException({ status: 'error', message: 'This Playlist is private' });
    }
    const cappedLimit = Math.min(limit, 100);
    const [likes, total] = await this.playlistRepository.getPlaylistLikes(
      playlistId,
      page,
      cappedLimit
    );

    const mappedLikes = likes.map((repost) => ({
      userId: repost.user.userId,
      username: repost.user.username,
      displayName: repost.user.displayName,
      avatarUrl: repost.user.avatarUrl,
      followersCount: repost.user.followersCount,
      repostedAt: repost.createdAt,
    }));
    return buildPaginationResponse(mappedLikes, total, page, limit);
  }

  async getUserPlaylistLikes(userId: string, myUserId: string, page: number, limit: number) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isPublic && user.userId !== myUserId) {
      throw new ForbiddenException('This account is private');
    }
    const cappedLimit = Math.min(limit, 100);
    const [likes, total] = await this.playlistRepository.getUserPlaylistReposts(
      userId,
      page,
      cappedLimit
    );
    const mappedReposts = likes.map((repost) => ({
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

    return buildPaginationResponse(mappedReposts, total, page, limit);
  }
}
