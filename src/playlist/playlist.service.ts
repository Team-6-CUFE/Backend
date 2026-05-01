import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import sharp from 'sharp';
import { PlaylistRepository } from './playlist.repository';
import { buildPaginationResponse } from '../common/utilities/pagination.util';
import { UserRepository } from '../user/user.repository';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { Playlist, PlaylistType, PlaylistTypeFilter } from './entities/playlist.entity';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { StorageService } from '../common/storage_service';
import { ActivityService } from '../activity/activity.service';
import { ActivityType } from '../activity/entities/activity.entity';
import { getLocationFromIp } from '../common/utilities/geolocation.util';
import { resolveAudioUrl } from '../common/utilities/audio.util';
import { addDocuments, deleteDocument, mapAlbum, mapPlaylist } from '../search/indexing';
import { generateVerificationToken } from '../common/utilities/tokens.util';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PlaylistService {
  constructor(
    private readonly playlistRepository: PlaylistRepository,
    private readonly userRepository: UserRepository,
    private readonly storageService: StorageService,
    private readonly activitiesService: ActivityService,
    private readonly notificationsService: NotificationsService
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

    if (playlist.type === PlaylistType.STATION) {
      throw new BadRequestException('You cannot repost a station playlist');
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
    await this.activitiesService.createActivity(
      ActivityType.PLAYLIST_REPOST,
      playlistId,
      userId,
      playlist.userId
    );

    const actor = await this.userRepository.findById(userId);
    if (actor) {
      await this.notificationsService.notifyNewRepost(playlist.userId, actor, { playlistId });
    }
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

    if (playlist.type === PlaylistType.STATION) {
      throw new BadRequestException("Can't view reposts for station playlists");
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

    if (playlist.type === PlaylistType.STATION) {
      throw new BadRequestException("Can't view reposts for station playlists");
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
    await this.activitiesService.createActivity(
      ActivityType.PLAYLIST_LIKE,
      playlistId,
      userId,
      playlist.userId
    );

    const actor = await this.userRepository.findById(userId);
    if (actor && playlist.userId !== userId) {
      // Prevent notifying yourself if liking your own public playlist
      await this.notificationsService.notifyNewLike(playlist.userId, actor, { playlistId });
    }

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

    if (playlist.type === PlaylistType.STATION) {
      throw new BadRequestException("Can't view likes for station playlists");
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
    limit: number = 20,
    filter?: PlaylistTypeFilter
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
      cappedLimit,
      filter
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
    await this.activitiesService.createActivity(
      ActivityType.PLAYLIST_POSTED,
      playlistCreated.playlistId,
      userId,
      userId
    );

    return {
      status: 'success',
      data: {
        playlistId: playlistCreated.playlistId,
        title: playlistCreated.title,
        isPublic: playlistCreated.isPublic,
        trackCount: playlistCreated.tracksCount,
        durationSeconds: playlistCreated.totalDurationSeconds,
        likesCount: playlistCreated.likesCount,
        repostsCount: playlistCreated.repostsCount,
        secretToken: playlistCreated.secretToken,
        createdAt: playlistCreated.createdAt,
      },
    };
  }

  // async updatePlaylist(
  //   userId: string,
  //   playlistId: string,
  //   updateDto: UpdatePlaylistDto,
  //   file?: Express.Multer.File
  // ) {
  //   const playlist = await this.playlistRepository.findPlaylistById(playlistId);
  //   if (!playlist) {
  //     throw new NotFoundException('Playlist not found');
  //   }
  //   if (playlist.userId !== userId) {
  //     throw new ForbiddenException('You can only edit your own playlists');
  //   }

  //   const updateData: Partial<Playlist> = {};

  //   if (updateDto.title !== undefined) {
  //     updateData.title = updateDto.title;
  //   }
  //   if (updateDto.description !== undefined) {
  //     updateData.description = updateDto.description;
  //   }
  //   if (updateDto.buyLink !== undefined) updateData.buyLink = updateDto.buyLink;
  //   if (updateDto.recordLabel !== undefined) updateData.recordLabel = updateDto.recordLabel;
  //   if (updateDto.type !== undefined) updateData.type = updateDto.type;
  //   if (updateDto.releaseDate !== undefined)
  //     updateData.releaseDate = new Date(updateDto.releaseDate);
  //   if (updateDto.permalink !== undefined) updateData.permalink = updateDto.permalink;
  //   if (file) {
  //     const oldCoverUrl = playlist.coverImage;

  //     const processedBuffer = await sharp(file.buffer)
  //       .resize(500, 500, { fit: 'cover' })
  //       .webp({ quality: 80 })
  //       .toBuffer();

  //     const processedFile: Express.Multer.File = {
  //       ...file,
  //       buffer: processedBuffer,
  //       originalname: `playlists/${playlistId}/cover_${Date.now()}.webp`,
  //       mimetype: 'image/webp',
  //       size: processedBuffer.length,
  //     };

  //     const uploaded = await this.storageService.uploadFile(processedFile);
  //     updateData.coverImage = uploaded.Location;

  //     if (oldCoverUrl) {
  //       this.storageService
  //         .deleteFile(oldCoverUrl)
  //         .catch((err) => console.warn(`Failed to delete old cover ${oldCoverUrl}`, err));
  //     }
  //   }
  //   if (updateDto.tags !== undefined) {
  //     const tags =
  //       updateDto.tags.length > 0
  //         ? await Promise.all(
  //             updateDto.tags.map((tag) => this.playlistRepository.findOrCreateGenre(tag))
  //           )
  //         : [];

  //     await this.playlistRepository.updatePlaylistTags(playlistId, tags);
  //   }
  //   if (updateDto.genre !== undefined) {
  //     if (updateDto.genre.length > 0) {
  //       // Find or create a single genre
  //       const genre = await this.playlistRepository.findOrCreateGenre(updateDto.genre);
  //       await this.playlistRepository.updatePlaylistGenre(playlistId, genre);
  //     } else {
  //       // If genre is empty string, set to null
  //       await this.playlistRepository.updatePlaylistGenre(playlistId, null);
  //     }
  //   }
  //   await this.playlistRepository.updatePlaylist(playlistId, updateData);
  //   const updatedWithTags = await this.playlistRepository.getPlaylistWithTagsandGenre(playlistId);
  //   return {
  //     status: 'Success',
  //     message: 'Playlist updated successfully',
  //     data: {
  //       playlistId: updatedWithTags!.playlistId,
  //       title: updatedWithTags!.title,
  //       description: updatedWithTags!.description,
  //       coverImage: updatedWithTags!.coverImage,
  //       updatedAt: updatedWithTags!.updatedAt,
  //       buyLink: updatedWithTags!.buyLink,
  //       recordLabel: updatedWithTags!.recordLabel,
  //       type: updatedWithTags!.type,
  //       releaseDate: updatedWithTags!.releaseDate,
  //       permalink: updatedWithTags!.permalink,
  //       tags: updatedWithTags!.tags.map((t) => ({ tagId: t.genreId, name: t.name })),
  //       genre: updatedWithTags!.genre?.name,
  //     },
  //   };
  // }
  async updatePlaylist(
    userId: string,
    playlistId: string,
    updateDto: UpdatePlaylistDto,
    file?: Express.Multer.File
  ) {
    const playlist = await this.playlistRepository.findPlaylistById(playlistId);
    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.userId !== userId)
      throw new ForbiddenException('You can only edit your own playlists');

    const updateData: Partial<Playlist> = {};

    // --- existing fields ---
    if (updateDto.title !== undefined) updateData.title = updateDto.title;
    if (updateDto.description !== undefined) updateData.description = updateDto.description;
    if (updateDto.buyLink !== undefined) updateData.buyLink = updateDto.buyLink;
    if (updateDto.recordLabel !== undefined) updateData.recordLabel = updateDto.recordLabel;
    if (updateDto.type !== undefined) updateData.type = updateDto.type;
    if (updateDto.releaseDate !== undefined)
      updateData.releaseDate = new Date(updateDto.releaseDate);
    if (updateDto.permalink !== undefined) updateData.permalink = updateDto.permalink;

    // --- privacy ---
    let newSecretToken: string | null = null;
    if (updateDto.isPublic !== undefined) {
      if (updateDto.isPublic && playlist.isPublic === true)
        throw new BadRequestException('Playlist is already public');
      if (!updateDto.isPublic && playlist.isPublic === false)
        throw new BadRequestException('Playlist is already private');

      if (!updateDto.isPublic) {
        newSecretToken = generateVerificationToken();
        updateData.secretToken = newSecretToken;
        updateData.isPublic = false;
      } else {
        updateData.secretToken = null;
        updateData.isPublic = true;
      }
    }

    // --- cover image ---
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

    // --- tags & genre ---
    if (updateDto.tags !== undefined) {
      const tags =
        updateDto.tags.length > 0
          ? await Promise.all(
              updateDto.tags.map((tag) => this.playlistRepository.findOrCreateGenre(tag))
            )
          : [];
      await this.playlistRepository.updatePlaylistTags(playlistId, tags);
    }

    if (updateDto.genre !== undefined) {
      if (updateDto.genre.length > 0) {
        const genre = await this.playlistRepository.findOrCreateGenre(updateDto.genre);
        await this.playlistRepository.updatePlaylistGenre(playlistId, genre);
      } else {
        await this.playlistRepository.updatePlaylistGenre(playlistId, null);
      }
    }

    // --- persist ---
    await this.playlistRepository.updatePlaylist(playlistId, updateData);

    // --- sync search index ---
    if (updateDto.isPublic === false) {
      await deleteDocument(`playlist_${playlistId}`);
      await deleteDocument(`album_${playlistId}`);
    } else {
      const updated = await this.playlistRepository.getPlaylistWithTagsandGenre(playlistId);
      if (updated) {
        const isAlbum = updated.type === PlaylistType.ALBUM;
        await deleteDocument(`playlist_${playlistId}`);
        await deleteDocument(`album_${playlistId}`);
        await addDocuments([isAlbum ? mapAlbum(updated) : mapPlaylist(updated)]);
      }
    }

    // --- response ---
    const updatedWithTags = await this.playlistRepository.getPlaylistWithTagsandGenre(playlistId);
    return {
      status: 'Success',
      message: 'Playlist updated successfully',
      data: {
        playlistId: updatedWithTags!.playlistId,
        title: updatedWithTags!.title,
        description: updatedWithTags!.description,
        coverImage: updatedWithTags!.coverImage,
        updatedAt: updatedWithTags!.updatedAt,
        buyLink: updatedWithTags!.buyLink,
        recordLabel: updatedWithTags!.recordLabel,
        type: updatedWithTags!.type,
        releaseDate: updatedWithTags!.releaseDate,
        permalink: updatedWithTags!.permalink,
        isPublic: updatedWithTags!.isPublic,
        ...(newSecretToken && { secretToken: newSecretToken }),
        tags: updatedWithTags!.tags.map((t) => ({ tagId: t.genreId, name: t.name })),
        genre: updatedWithTags!.genre?.name,
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
    cappedLimit: number,
    filter?: PlaylistTypeFilter
  ): Promise<[any[], number]> {
    const [playlists, total] = await this.playlistRepository.getTrackPlaylists(
      trackId,
      currentUserId,
      page,
      cappedLimit,
      filter
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
          playlistId: playlisId,
          isPublic: false,
          secretToken: newToken,
        },
      };
    }
    await this.playlistRepository.changePlaylistPrivacy(playlisId, isPublic);
    return {
      status: 'success',
      data: {
        playlistId: playlisId,
        isPublic: true,
      },
    };
  }

  async getPublicPlaylist(playlistId: string, userId: string, ip?: string, plan?: string) {
    const playlist = await this.playlistRepository.getPublicPlaylist(playlistId);

    if (!playlist) {
      throw new NotFoundException('Playlist not found or is private');
    }

    // Double-check logic: if repository returns it, isPublic was already true.
    // But keeping your guard clause for safety:
    if (!playlist.isPublic && userId !== playlist.userId) {
      throw new ForbiddenException('Secret playlist is requested');
    }

    const country = ip ? getLocationFromIp(ip).country : null;
    let returnSecret = false;
    if (!playlist.isPublic) {
      if (playlist.userId === userId) {
        returnSecret = true;
      }
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
        genreName: playlist.genre?.name,
        genreId: playlist.genre?.genreId,
        secretToken: returnSecret ? playlist.secretToken : undefined,
        tags: playlist.tags.map((tag) => ({
          tagId: tag.genreId,
          name: tag.name,
        })),
        user: {
          userId: playlist.user.userId,
          username: playlist.user.username,
          displayName: playlist.user.displayName,
          avatarUrl: playlist.user.avatarUrl,
        },
        tracks: playlist.playlistTracks.map((pt) => {
          const isBlocked = !!(country && pt.track.blockedRegions?.includes(country));
          return {
            position: pt.position,
            trackId: pt.track.trackId,
            title: pt.track.title,
            durationSeconds: pt.track.durationSeconds,
            coverImage: pt.track.coverImage,
            audioUrl: isBlocked ? null : resolveAudioUrl(pt.track, plan),
            waveformUrl: isBlocked ? null : (pt.track.waveformUrl ?? null),
            playCount: pt.track.playCount,
            likesCount: pt.track.likesCount,
            repostsCount: pt.track.repostsCount,
            commentsCount: pt.track.commentsCount,
            artist: {
              userId: pt.track.userId,
              username: pt.track.user?.username || 'unknown',
              displayName: pt.track.user?.displayName || 'Unknown Artist',
              avatarUrl: pt.track.user?.avatarUrl || null,
            },
          };
        }),
      },
    };
  }

  async getSecretPlaylist(secretToken: string, ip?: string) {
    const playlist = await this.playlistRepository.getSecretPlaylist(secretToken);

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    const country = ip ? getLocationFromIp(ip).country : null;

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
        genreName: playlist.genre?.name ?? null,
        genreId: playlist.genre?.genreId ?? null,
        tags: playlist.tags.map((tag) => ({
          tagId: tag.genreId,
          name: tag.name,
        })),
        user: {
          userId: playlist.user.userId,
          username: playlist.user.username,
          displayName: playlist.user.displayName,
          avatarUrl: playlist.user.avatarUrl,
        },
        tracks: playlist.playlistTracks.map((pt) => {
          const isBlocked = !!(country && pt.track.blockedRegions?.includes(country));
          return {
            position: pt.position,
            trackId: pt.track.trackId,
            title: pt.track.title,
            durationSeconds: pt.track.durationSeconds,
            coverImage: pt.track.coverImage,
            audioUrl: isBlocked ? null : (pt.track.audioUrl ?? null),
            waveformUrl: isBlocked ? null : (pt.track.waveformUrl ?? null),
            playCount: pt.track.playCount,
            likesCount: pt.track.likesCount,
            repostsCount: pt.track.repostsCount,
            commentsCount: pt.track.commentsCount,
            artist: {
              userId: pt.track.userId,
              username: pt.track.user?.username || 'unknown',
              displayName: pt.track.user?.displayName || 'Unknown Artist',
              avatarUrl: pt.track.user?.avatarUrl || null,
            },
          };
        }),
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
      },
    };
  }

  async getMyPlaylists(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filter?: PlaylistTypeFilter
  ) {
    const [playlists, total] = await this.playlistRepository.getMyPlaylists(
      userId,
      page,
      limit,
      filter
    );

    const mappedPlaylists = playlists.map((playlist) => ({
      playlistId: playlist.playlistId,
      title: playlist.title,
      description: playlist.description,
      coverImage: playlist.coverImage,
      isPublic: playlist.isPublic,
      tracksCount: playlist.tracksCount,
      likesCount: playlist.likesCount,
      repostsCount: playlist.repostsCount,
      durationSeconds: playlist.totalDurationSeconds,
      createdAt: playlist.createdAt,
      user: {
        userId: playlist.user?.userId,
        username: playlist.user?.username,
        displayName: playlist.user?.displayName,
        avatarUrl: playlist.user?.avatarUrl,
      },
      isOwner: playlist.userId === userId,
    }));

    return {
      status: 'success',
      ...buildPaginationResponse(mappedPlaylists, total, page, limit),
    };
  }

  async getUserPlaylists(
    userId: string,
    myUserId: string | null,
    page: number = 1,
    limit: number = 20,
    filter?: PlaylistTypeFilter
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isPublic && user.userId !== myUserId) {
      throw new ForbiddenException('This account is private');
    }

    const [playlists, total] = await this.playlistRepository.getUserPlaylists(
      userId,
      page,
      limit,
      filter
    );

    const mappedPlaylists = playlists.map((playlist) => ({
      playlistId: playlist.playlistId,
      title: playlist.title,
      description: playlist.description,
      coverImage: playlist.coverImage,
      isPublic: playlist.isPublic,
      tracksCount: playlist.tracksCount,
      likesCount: playlist.likesCount,
      repostsCount: playlist.repostsCount,
      durationSeconds: playlist.totalDurationSeconds,
      createdAt: playlist.createdAt,
      user: {
        userId: playlist.user?.userId,
        username: playlist.user?.username,
        displayName: playlist.user?.displayName,
        avatarUrl: playlist.user?.avatarUrl,
      },
      isOwner: playlist.userId === userId,
    }));

    return {
      status: 'success',
      ...buildPaginationResponse(mappedPlaylists, total, page, limit),
    };
  }
}
