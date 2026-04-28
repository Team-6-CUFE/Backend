import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DownloadedPlaylist } from './entities/downloaded-playlists.entity';
import { DownloadedTrack, DownloadSource } from './entities/downloaded-tracks.entity';
import { DownloadStatus } from './enums/download-status.enum';

@Injectable()
export class DownloadRepository {
  constructor(
    @InjectRepository(DownloadedPlaylist)
    private readonly downloadedPlaylistRepository: Repository<DownloadedPlaylist>,

    @InjectRepository(DownloadedTrack)
    private readonly downloadedTrackRepository: Repository<DownloadedTrack>
  ) {}

  async saveDownloadedTrack(
    userId: string,
    trackId: string,
    sourcePlaylistId?: string,
    source: DownloadSource = DownloadSource.TRACK
  ) {
    const downloadedTrack = this.downloadedTrackRepository.create({
      userId,
      trackId,
      sourcePlaylistId,
      source,
    });
    await this.downloadedTrackRepository.save(downloadedTrack);
  }

  async saveDownloadedPlaylist(userId: string, playlistId: string) {
    const downloadedPlaylist = this.downloadedPlaylistRepository.create({
      userId,
      playlistId,
    });
    await this.downloadedPlaylistRepository.save(downloadedPlaylist);
  }

  async updateDownloadedPlaylistStatus(playlistId: string, userId: string, status: DownloadStatus) {
    await this.downloadedPlaylistRepository.update({ playlistId, userId }, { status });
  }

  async deleteDownloadedTrack(downloadId: string) {
    await this.downloadedTrackRepository.delete({ downloadId });
  }

  async deleteDownloadedPlaylist(playlistId: string, userId: string) {
    await this.downloadedPlaylistRepository.delete({ playlistId, userId });
  }
}
