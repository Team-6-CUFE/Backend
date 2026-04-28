import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { TrackRepository } from '../track/track.repository';
import { DownloadRepository } from './download.repository';
import { DownloadedTrack, DownloadSource } from './entities/downloaded-tracks.entity';
import { DownloadStatus } from './enums/download-status.enum';
import { PlaylistRepository } from '../playlist/playlist.repository';
import { TrackVisibility } from '../track/enums/track-visibility.enum';
import { getLocationFromIp } from '../common/utilities/geolocation.util';

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

  async downloadTrack(trackId: string, userId: string) {
    // Check if the track is downloadable
    const isDownloadable = await this.trackRepository.isTrackDownloadable(trackId);
    if (!isDownloadable) {
      throw new ForbiddenException('Track is not available for download');
    }

    // check if the track is private
    const isPrivate = await this.trackRepository.isPrivate(trackId);
    if (isPrivate) {
      throw new ForbiddenException('Track is private and cannot be downloaded');
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
}
