import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { TrackRepository } from '../track/track.repository';
import { DownloadRepository } from './download.repository';
import { DownloadedTrack, DownloadSource } from './entities/downloaded-tracks.entity';
import { DownloadStatus } from './enums/download-status.enum';
import { PlaylistRepository } from '../playlist/playlist.repository';
import { TrackVisibility } from '../track/enums/track-visibility.enum';
import { getLocationFromIp } from '../common/utilities/geolocation.util';
import { Track } from '../track/entities/track.entity';
import { Playlist } from '../playlist/entities/playlist.entity';
import { User } from '../user/entities/user.entity';
import { Genre } from '../genre/entities/genre.entity';

// mock sleep function to simulate download time
const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

@Injectable()
export class DownloadService {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly downloadRepository: DownloadRepository,
    private readonly playlistRepository: PlaylistRepository
  ) {}

  async downloadTrack(trackId: string, userId: string, ip: string) {
    const { country } = getLocationFromIp(ip);
    const track = await this.trackRepository.findById(trackId);

    if (!track) {
      throw new BadRequestException('Track not found');
    }

    if (!track.offlineListening) {
      throw new ForbiddenException('Track is not available for download');
    }

    if (track.visibility === TrackVisibility.PRIVATE) {
      throw new ForbiddenException('Track is private and cannot be downloaded');
    }

    if (country && track.blockedRegions.includes(country)) {
      throw new ForbiddenException('Track is not available in your region');
    }

    const isDownloaded = await this.downloadRepository.getDownloadedTrack(
      userId,
      trackId,
      DownloadSource.TRACK
    );
    if (isDownloaded) {
      throw new BadRequestException('Track has already been downloaded by this user');
    }

    const downloadTrack = await this.downloadRepository.saveDownloadedTrack(userId, trackId);

    await sleep(2000); // mock download time
    await this.downloadRepository.updateDownloadedTrackStatus(
      downloadTrack.downloadId,
      DownloadStatus.COMPLETED
    );
    return {
      status: 'success',
      message: 'Track downloaded successfully',
      downloadId: downloadTrack.downloadId,
    };
  }

  async deleteDownloadedTrack(trackId: string, userId: string) {
    const isDownloaded = await this.downloadRepository.getDownloadedTrack(
      userId,
      trackId,
      DownloadSource.TRACK
    );
    if (!isDownloaded) {
      throw new BadRequestException('Track has not been downloaded by this user');
    }

    await this.downloadRepository.deleteDownloadedTrack(trackId, userId);
    return {
      status: 'success',
      message: 'Downloaded track deleted successfully',
    };
  }

  async downloadPlaylist(playlistId: string, userId: string, ip: string) {
    const playlist = await this.playlistRepository.getPlaylistDetails(playlistId);
    if (!playlist) {
      throw new BadRequestException('Playlist not found');
    }

    const tracks = playlist.playlistTracks;
    if (tracks.length === 0) {
      throw new BadRequestException('Playlist has no tracks to download');
    }

    if (!playlist.isPublic) {
      throw new ForbiddenException('Playlist is private and cannot be downloaded');
    }

    const alreadyDownloaded = await this.downloadRepository.getDownloadedPlaylist(
      userId,
      playlistId
    );
    if (alreadyDownloaded) {
      throw new BadRequestException('Playlist has already been downloaded by this user');
    }

    const { country } = getLocationFromIp(ip);
    // mark playlist as pending first
    await this.downloadRepository.saveDownloadedPlaylist(userId, playlistId);
    const downloads: DownloadedTrack[] = [];
    const skipped: string[] = [];
    // Insert all tracks as 'pending' first
    await Promise.all(
      tracks.map(async (track) => {
        if (
          !track.track.offlineListening ||
          track.track.visibility === TrackVisibility.PRIVATE ||
          (country && track.track.blockedRegions.includes(country))
        ) {
          skipped.push(track.track.trackId);
          return;
        }
        const download = await this.downloadRepository.saveDownloadedTrack(
          userId,
          track.trackId,
          playlistId,
          DownloadSource.PLAYLIST
        );
        downloads.push(download);
      })
    );

    // "Download" all simultaneously
    await Promise.all(
      downloads.map(async (download) => {
        await sleep(2000);
        await this.downloadRepository.updateDownloadedTrackStatus(
          download.downloadId,
          DownloadStatus.COMPLETED
        );
      })
    );

    await this.downloadRepository.updateDownloadedPlaylistStatus(
      playlistId,
      userId,
      DownloadStatus.COMPLETED
    );

    return {
      status: 'success',
      message: 'Playlist downloaded successfully',
      downloadedTracks: downloads.length,
      downloadedTrackIds: downloads.map((d) => d.trackId),
      downloadIds: downloads.map((d) => d.downloadId),
      skippedTracks: skipped.length,
      skippedTrackIds: skipped,
    };
  }

  async deleteDownloadedPlaylist(playlistId: string, userId: string) {
    const result = await this.downloadRepository.deleteDownloadedPlaylist(playlistId, userId);
    if (!result) {
      throw new BadRequestException('Playlist has not been downloaded by this user');
    }
    return {
      status: 'success',
      message: 'Downloaded playlist and associated tracks deleted successfully',
    };
  }

  async getDownloadedList(userId: string, page: number = 1, limit: number = 20) {
    const [[tracks, totalTracks], [playlists, totalPlaylists]] = await Promise.all([
      this.trackRepository.getDownloadedTracksByUser(userId, page, limit),
      this.playlistRepository.getDownloadedPlaylistsByUser(userId, page, limit),
    ]);

    const playlistIds = playlists.map((p) => p.playlistId);

    // Fetch the downloaded tracks per playlist
    const playlistDownloadedTracks = await this.downloadRepository.getDownloadedTracksByPlaylistIds(
      userId,
      playlistIds
    );

    // Collect all unique track IDs to batch liked/reposted lookups
    const individualTrackIds = tracks.map((t) => t.trackId);
    const playlistTrackIds = playlistDownloadedTracks.map((dt) => dt.trackId);
    const allTrackIds = [...new Set([...individualTrackIds, ...playlistTrackIds])];

    const [likedTrackIds, repostedTrackIds, likedPlaylistIds, repostedPlaylistIds] =
      await Promise.all([
        this.trackRepository.getUserLikedTrackIds(userId, allTrackIds),
        this.trackRepository.getUserRepostedTrackIds(userId, allTrackIds),
        this.playlistRepository.getUserLikedPlaylistIds(userId, playlistIds),
        this.playlistRepository.getUserRepostedPlaylistIds(userId, playlistIds),
      ]);

    // Group playlist downloaded tracks by sourcePlaylistId
    const tracksByPlaylist = playlistDownloadedTracks.reduce<Record<string, DownloadedTrack[]>>(
      (acc, dt) => {
        const key = dt.sourcePlaylistId!;
        if (!acc[key]) acc[key] = [];
        acc[key].push(dt);
        return acc;
      },
      {}
    );

    return {
      status: 'success',
      data: {
        tracks: {
          items: tracks.map((t) => this.formatTrack(t, likedTrackIds, repostedTrackIds)),
          total: totalTracks,
        },
        playlists: {
          items: playlists.map((p) =>
            this.formatPlaylist(
              p,
              tracksByPlaylist[p.playlistId] ?? [],
              likedPlaylistIds,
              repostedPlaylistIds,
              likedTrackIds,
              repostedTrackIds
            )
          ),
          total: totalPlaylists,
        },
      },
    };
  }

  private formatTrack(
    track: Track,
    likedIds: Set<string>,
    repostedIds: Set<string>
  ): Record<string, any> {
    const user = track.user as User;
    const genre = track.genre as Genre;
    return {
      trackId: track.trackId,
      title: track.title,
      coverImage: track.coverImage,
      audioUrl: track.audioUrl,
      waveformUrl: track.waveformUrl,
      durationSeconds: track.durationSeconds,
      playCount: track.playCount,
      likesCount: track.likesCount,
      repostsCount: track.repostsCount,
      commentsCount: track.commentsCount,
      mainArtists: track.mainArtists,
      createdAt: track.createdAt,
      genre: genre ? { genreId: genre.genreId, name: genre.name } : null,
      user: user
        ? {
            userId: user.userId,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            followersCount: user.followersCount,
            city: user.city,
            country: user.country,
          }
        : null,
      isLiked: likedIds.has(track.trackId),
      isReposted: repostedIds.has(track.trackId),
    };
  }

  private formatPlaylist(
    playlist: Playlist,
    downloadedTracks: DownloadedTrack[],
    likedPlaylistIds: Set<string>,
    repostedPlaylistIds: Set<string>,
    likedTrackIds: Set<string>,
    repostedTrackIds: Set<string>
  ): Record<string, any> {
    const owner = playlist.user as User;
    return {
      playlistId: playlist.playlistId,
      title: playlist.title,
      description: playlist.description,
      coverImage: playlist.coverImage,
      tracksCount: playlist.tracksCount,
      durationSeconds: playlist.totalDurationSeconds,
      likesCount: playlist.likesCount,
      repostsCount: playlist.repostsCount,
      createdAt: playlist.createdAt,
      isLiked: likedPlaylistIds.has(playlist.playlistId),
      isReposted: repostedPlaylistIds.has(playlist.playlistId),
      user: owner
        ? {
            userId: owner.userId,
            username: owner.username,
            displayName: owner.displayName,
            avatarUrl: owner.avatarUrl,
            city: owner.city,
            country: owner.country,
            followersCount: owner.followersCount,
          }
        : null,
      playlistTracks: downloadedTracks.map((dt) =>
        this.formatTrack(dt.track, likedTrackIds, repostedTrackIds)
      ),
    };
  }
}
