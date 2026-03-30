import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PlaylistRepository } from './playlist.repository';

@Injectable()
export class PlaylistService {
  constructor(private readonly playlistRepository: PlaylistRepository) {}

  async repostPlaylist(playlistId: string, userId: string) {
    // we need to check if playlist exists
    // we need to check if user has already reposted the playlist
    // if not, we create a new repost entry in the database
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    if (!playlist) {
      throw new BadRequestException({ message: 'playlist not found' });
    }
    const alreadyReposted = await this.playlistRepository.findRepostByUserAndPlaylist(
      userId,
      playlistId
    );
    if (alreadyReposted) {
      throw new ConflictException({
        message: 'You have already reposted this playlist',
      });
    }
    // check if playlist is private//
    const isPrivate = playlist.isPublic;
    if (!isPrivate) {
      throw new ForbiddenException({
        message: 'Cannot repost a private playlist',
      });
    }
    // check if user is the owner of the playlist
    if (playlist.userId === userId) {
      throw new BadRequestException({
        message: 'You cannot repost your own playlist',
      });
    }
    await this.playlistRepository.createRepost(userId, playlistId);
    return {
      userId,
      playlistId,
      repostedAt: new Date(),
    };
  }

  // this function removes a user's repost
  async removeRepost(playlistId: string, userId: string) {
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    if (!playlist) {
      throw new BadRequestException({ message: 'playlist not found' });
    }
    // check if user reposted this playlist or not
    const isReposted = await this.playlistRepository.findRepostByUserAndPlaylist(
      userId,
      playlistId
    );
    if (!isReposted) {
      throw new ForbiddenException({
        message: 'you have not reposted this playlist',
      });
    }
    const { isPublic } = playlist;
    if (!isPublic) {
      throw new ForbiddenException({ message: 'This Playlist is Private' });
    }
    await this.playlistRepository.removeRepost(userId, playlistId);
    return {
      message: 'Playlist repost successfully removed',
    };
  }

  async getRepostsCount(playlistId: string) {
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    if (!playlist) {
      throw new BadRequestException({ message: 'playlist not found' });
    }
    const { isPublic } = playlist;
    if (!isPublic) {
      throw new ForbiddenException({ message: 'This Playlist is Private' });
    }
    const repostCount = playlist.repostsCount;
    return {
      playlistId,
      repostCount,
    };
  }
}
