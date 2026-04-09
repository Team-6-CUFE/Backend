import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { PlaylistRepository } from './playlist.repository';
import { buildPaginationResponse } from '../common/utilities/pagination.util';
import { UserRepository } from '../user/user.repository';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { Playlist } from './entities/playlist.entity';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { StorageService } from '../common/storage_service';

@Injectable()
export class PlaylistService {
  constructor(
    private readonly playlistRepository: PlaylistRepository,
    private readonly userRepository: UserRepository,
    private configService: ConfigService,
    private readonly storageService: StorageService
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

  async createPlaylist(createPlaylistDto: CreatePlaylistDto, userId: string) {
    const playlistCreated = await this.playlistRepository.createPlaylist(createPlaylistDto, userId);
    let shareUrl = '';
    if (createPlaylistDto.isPublic) {
      shareUrl = `${this.configService.get('HARMONICA_BASE_URL')}/playlist/${playlistCreated.playlistId}`;
    } else {
      shareUrl = `${this.configService.get('HARMONICA_BASE_URL')}/playlist/secret/${playlistCreated.secretToken}`;
    }
    console.log('created playlist: ', playlistCreated);
    return {
      status: 'sucesss',
      data: {
        playlistId: playlistCreated.playlistId,
        title: playlistCreated.title,
        isPublic: playlistCreated.isPublic,
        trackCount: playlistCreated.tracksCount,
        durationSeconds: playlistCreated.totalDurationSeconds,
        likesCount: playlistCreated.likesCount,
        repostsCount: playlistCreated.repostsCount,
        secretToken: playlistCreated.secretToken,
        shareUrl,
        createdAt: playlistCreated.createdAt,
      },
    };
  }

  async updatePlaylist(
    userId: string,
    playlistId: string,
    updateDto: UpdatePlaylistDto,
    file?: Express.Multer.File
  ) {
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }
    if (playlist.userId !== userId) {
      throw new ForbiddenException('You can only edit your own playlists');
    }

    const updateData: Partial<Playlist> = {};

    if (updateDto.title !== undefined) {
      updateData.title = updateDto.title;
    }
    if (updateDto.description !== undefined) {
      updateData.description = updateDto.description;
    }

    if (file) {
      const oldCoverUrl = playlist.coverImage;

      const processedBuffer = await sharp(file.buffer)
        .resize(500, 500, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer();

      const processedFile: Express.Multer.File = {
        ...file,
        buffer: processedBuffer,
        originalname: `playlists/${playlistId}/cover_${Date.now()}.webp`,
        mimetype: 'image/webp',
        size: processedBuffer.length,
      };

      const uploaded = await this.storageService.uploadFile(processedFile);
      updateData.coverImage = uploaded.Location;

      if (oldCoverUrl) {
        this.storageService
          .deleteFile(oldCoverUrl)
          .catch((err) => console.warn(`Failed to delete old cover ${oldCoverUrl}`, err));
      }
    }

    const updated = await this.playlistRepository.updatePlaylist(playlistId, updateData);

    return {
      status: 'Success',
      message: 'Playlist updated successfully',
      data: {
        playlistId: updated!.playlistId,
        title: updated!.title,
        description: updated!.description,
        coverImage: updated!.coverImage,
        updatedAt: updated!.updatedAt,
      },
    };
  }

  async addTrackToPlaylist(playlistId: string, trackId: string, userId: string) {
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }
    if (playlist.userId !== userId) {
      throw new ForbiddenException('You are not the owner of this playlist');
    }

    const track = await this.playlistRepository.findTrackById(trackId);
    if (!track) {
      throw new NotFoundException('Track not found');
    }

    const nextPosition = (playlist.tracksCount || 0) + 1;

    const savedRelation = await this.playlistRepository.addTrackToPlaylist(
      playlistId,
      trackId,
      nextPosition
    );

    const updatedPlaylist = await this.playlistRepository.findPlaylistById(playlistId);

    return {
      status: 'success',
      data: {
        playlistId: savedRelation.playlistId,
        trackId: savedRelation.trackId,
        position: savedRelation.position,
        playlist: {
          trackCount: updatedPlaylist!.tracksCount,
          durationSeconds: updatedPlaylist!.totalDurationSeconds,
        },
      },
    };
  }

  async removeTrackFromPlaylist(playlistId: string, trackId: string, userId: string) {
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }
    if (playlist.userId !== userId) {
      throw new ForbiddenException('You are not the owner of this playlist');
    }

    const relation = await this.playlistRepository.findTrackInPlaylist(playlistId, trackId);
    if (!relation) {
      throw new NotFoundException('Track is not in this playlist');
    }

    await this.playlistRepository.removeTrackAndReorder(playlistId, trackId, relation.position);

    const updatedPlaylist = await this.playlistRepository.findPlaylistById(playlistId);

    return {
      status: 'success',
      data: {
        playlistId,
        trackId,
        action: 'removed',
        playlist: {
          trackCount: updatedPlaylist!.tracksCount,
          durationSeconds: updatedPlaylist!.totalDurationSeconds,
        },
      },
    };
  }

  async deletePlaylist(playlistId: string, userId: string) {
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (playlist.userId !== userId) {
      throw new ForbiddenException('You are not authorized to delete this playlist');
    }

    await this.playlistRepository.deletePlaylist(playlistId);

    return {
      status: 'success',
      message: 'Playlist deleted successfully',
    };
  }

  async getPlaylist(playlistId: string, userId: string | null, secretToken?: string) {
    const playlist = await this.playlistRepository.getPlaylistDetails(playlistId);

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (!playlist.isPublic) {
      const isOwner = userId === playlist.userId;
      const hasValidSecretToken = secretToken && playlist.secretToken === secretToken;

      if (!isOwner && !hasValidSecretToken) {
        throw new ForbiddenException('This playlist is private');
      }
    }

    return {
      status: 'success',
      data: {
        ...playlist,
        tracks: playlist.playlistTracks.map((pt) => ({
          position: pt.position,
          trackId: pt.trackId,
          title: pt.track.title,
          durationSeconds: pt.track.durationSeconds,
          coverImage: pt.track.coverImage,
        })),
      },
    };
  }

  async reorder(playlistId: string, trackIds: string[], userId: string) {
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.userId !== userId) throw new ForbiddenException('Not the owner');

    if (trackIds.length !== playlist.tracksCount) {
      throw new BadRequestException(
        'The provided track list length does not match the playlist size'
      );
    }

    const currentTrackIds = await this.playlistRepository.findAllTrackIdsInPlaylist(playlistId);

    const allTracksMatch = trackIds.every((id) => currentTrackIds.includes(id));

    if (!allTracksMatch) {
      throw new BadRequestException(
        'The provided track IDs do not match the tracks in this playlist'
      );
    }

    await this.playlistRepository.reorderTracks(playlistId, trackIds);

    return {
      status: 'success',
      message: 'Playlist tracks reordered successfully.',
      data: {
        playlistId: playlist.playlistId,
        trackCount: playlist.tracksCount,
      },
    };
  }

  async getTrackPlaylists(
    trackId: string,
    currentUserId: string,
    page: number,
    cappedLimit: number
  ): Promise<[any[], number]> {
    const [playlists, total] = await this.playlistRepository.getTrackPlaylists(
      trackId,
      currentUserId,
      page,
      cappedLimit
    );
    return [playlists, total];
  }

  async changePlaylistPrivacy(playlisId: string, isPublic: boolean, userId: string) {
    const playlist = await this.playlistRepository.findPlaylistById(playlisId);
    if (!playlist) {
      throw new NotFoundException('playlist not found');
    }
    if (userId !== playlist?.userId) {
      throw new ForbiddenException('you are not the playlist owner');
    }
    if (isPublic && playlist.isPublic === true) {
      throw new BadRequestException('playlist already public');
    }
    if (!isPublic && playlist.isPublic === false) {
      throw new BadRequestException('playlist already private');
    }
    if (!isPublic) {
      const newToken = await this.playlistRepository.changePlaylistPrivacy(playlisId, isPublic);
      return {
        status: 'success',
        data: {
          playlisId,
          isPublic: false,
          secretToken: newToken,
          shareUrl: `${this.configService.get('HARMONICA_BASE_URL')}/playlist/secret/${newToken}`,
        },
      };
    }
    await this.playlistRepository.changePlaylistPrivacy(playlisId, isPublic);
    return {
      status: 'sucess',
      data: {
        playlisId,
        isPublic: true,
        shareUrl: `${this.configService.get('HARMONICA_BASE_URL')}/playlist/${playlisId}`,
      },
    };
  }

  async getPublicPlaylist(playlistId: string, userId: string) {
    const playlist = await this.playlistRepository.getPublicPlaylist(playlistId);

    if (!playlist) {
      throw new NotFoundException('Playlist not found or is private');
    }

    // Double-check logic: if repository returns it, isPublic was already true.
    // But keeping your guard clause for safety:
    if (!playlist.isPublic && userId !== playlist.userId) {
      throw new ForbiddenException('Secret playlist is requested');
    }

    return {
      status: 'success',
      data: {
        playlistId: playlist.playlistId,
        title: playlist.title,
        description: playlist.description,
        coverImage: playlist.coverImage,
        isPublic: playlist.isPublic,
        tracksCount: playlist.tracksCount,
        durationSeconds: playlist.totalDurationSeconds,
        likesCount: playlist.likesCount,
        repostsCount: playlist.repostsCount,
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt,
        tags: playlist.tags.map((tag) => ({
          tagId: tag.tagId,
          name: tag.name,
        })),
        user: {
          user_id: playlist.user.userId,
          displayName: playlist.user.displayName,
          avatarUrl: playlist.user.avatarUrl,
        },
        tracks: playlist.playlistTracks.map((pt) => ({
          position: pt.position,
          trackId: pt.track.trackId,
          title: pt.track.title,
          duration_seconds: pt.track.durationSeconds,
          coverImage: pt.track.coverImage,
          playCount: pt.track.playCount,
          likesCount: pt.track.likesCount,
          repostsCount: pt.track.repostsCount,
          commentsCount: pt.track.commentsCount,
        })),
      },
    };
  }

  async getSecretPlaylist(secretToken: string) {
    const playlist = await this.playlistRepository.getSecretPlaylist(secretToken);

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    console.log('playlist:', playlist);
    return {
      status: 'success',
      data: {
        playlisId: playlist.playlistId,
        title: playlist.title,
        description: playlist.description,
        coverImage: playlist.coverImage,
        isPublic: playlist.isPublic,
        tracksCount: playlist.tracksCount,
        durationSeconds: playlist.totalDurationSeconds,
        likesCount: playlist.likesCount,
        repostsCount: playlist.repostsCount,
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt,
        tags: playlist.tags.map((tag) => ({
          tagId: tag.tagId,
          name: tag.name,
        })),
        user: {
          user_id: playlist.user.userId,
          displayName: playlist.user.displayName,
          avatarUrl: playlist.user.avatarUrl,
        },
        tracks: playlist.playlistTracks.map((pt) => ({
          position: pt.position,
          trackId: pt.track.trackId,
          title: pt.track.title,
          duration_seconds: pt.track.durationSeconds,
          coverImage: pt.track.coverImage,
          playCount: pt.track.playCount,
          likesCount: pt.track.likesCount,
          repostsCount: pt.track.repostsCount,
          commentsCount: pt.track.commentsCount,
        })),
      },
    };
  }

  async resetSecretToken(playlistId: string, userId: string) {
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    if (!playlist) {
      throw new NotFoundException('playlist not found');
    }
    if (playlist.isPublic) {
      throw new BadRequestException('Playlist is public');
    }
    if (!playlist.isPublic && userId !== playlist.userId) {
      throw new ForbiddenException('You are not the owner of this playlist');
    }
    const newSecretToken = await this.playlistRepository.resetSecretToken(playlistId);
    return {
      status: 'success',
      data: {
        playlistId: playlist.playlistId,
        secretToken: newSecretToken,
        shareUrl: `${this.configService.get('HARMONICA_BASE_URL')}/playlist/secret/${newSecretToken}`,
      },
    };
  }
}
