import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { TrackRepository } from '../track/track.repository';
import { DownloadRepository } from './download.repository';
import { DownloadSource } from './entities/downloaded-tracks.entity';
import { DownloadStatus } from './enums/download-status.enum';

@Injectable()
export class DownloadService {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly downloadRepository: DownloadRepository
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
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      });
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
}
